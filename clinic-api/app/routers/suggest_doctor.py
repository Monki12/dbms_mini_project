import json
import logging
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import oracledb

from app.database import get_db
from app.dependencies import get_current_user
from app.exceptions import format_envelope
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Appointment Suggestion"])

# ── Time slots the clinic offers ────────────────────────────────
TIME_SLOTS = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "14:00", "14:30", "15:00", "15:30",
    "16:00", "16:30", "17:00", "17:30",
]

# ── Keyword → department specialty fallback map ──────────────────
KEYWORD_SPECIALTY_MAP = [
    (["chest pain", "breathless", "palpitation", "hypertension", "cardiac", "heart"], "Cardiology"),
    (["headache", "dizziness", "numbness", "seizure", "migraine", "neurolog"], "Neurology"),
    (["fracture", "joint", "back pain", "sprain", "knee", "bone", "ortho"], "Orthopaedics"),
    (["fever", "cold", "cough", "sore throat", "general", "routine", "flu", "vomit", "diarrhea"], "General Medicine"),
]


class SymptomsRequest(BaseModel):
    symptoms: str


def _get_free_slots(
    db: oracledb.Connection,
    doctor_ids: list[int],
    max_slots: int = 5,
) -> dict[int, list[dict]]:
    """Return up to `max_slots` free (date, time) pairs per doctor in next 30 days."""
    today = date.today()
    end_date = today + timedelta(days=30)

    # Fetch all booked non-cancelled slots for these doctors in the window
    with db.cursor() as cursor:
        bind_ids = ",".join(str(d) for d in doctor_ids) if doctor_ids else "0"
        cursor.execute(f"""
            SELECT doctor_id,
                   TO_CHAR(appt_date, 'YYYY-MM-DD') AS appt_date,
                   TO_CHAR(slot_start, 'HH24:MI') AS slot_time
            FROM APPOINTMENT
            WHERE doctor_id IN ({bind_ids})
              AND status != 'CANCELLED'
              AND appt_date BETWEEN :1 AND :2
        """, [today, end_date])
        booked: set[tuple] = {
            (row[0], row[1], row[2]) for row in cursor.fetchall()
        }

    result: dict[int, list[dict]] = {did: [] for did in doctor_ids}
    current = today
    while current <= end_date:
        date_str = current.isoformat()
        for did in doctor_ids:
            if len(result[did]) >= max_slots:
                continue
            for slot in TIME_SLOTS:
                if len(result[did]) >= max_slots:
                    break
                if (did, date_str, slot) not in booked:
                    result[did].append({"date": date_str, "time": slot})
        current += timedelta(days=1)

    return result


def _keyword_fallback(symptoms: str, doctors: list[dict]) -> tuple[list[dict], bool]:
    """Return (ranked_doctor_list, emergency_flag) using keyword matching."""
    lower = symptoms.lower()
    emergency = any(kw in lower for kw in [
        "chest pain", "difficulty breathing", "stroke", "bleeding", "unconscious", "severe"
    ])
    matched_specialty = None
    for keywords, specialty in KEYWORD_SPECIALTY_MAP:
        if any(kw in lower for kw in keywords):
            matched_specialty = specialty
            break

    if matched_specialty:
        ranked = [d for d in doctors if matched_specialty.lower() in (d["specialisation"] or "").lower()]
    else:
        ranked = [d for d in doctors if "general" in (d["specialisation"] or "").lower()]

    if not ranked:
        ranked = doctors[:4]

    return [
        {**d, "reason": f"Specializes in {d['specialisation']} conditions."}
        for d in ranked[:4]
    ], emergency


def _call_gemini(symptoms: str, doctors: list[dict]) -> tuple[list[dict], bool] | None:
    """Call Gemini 2.0 Flash. Returns (annotated_doctors, emergency) or None on any failure."""
    if not settings.GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai  # lazy import — not installed until pip install
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        doctor_list_text = "\n".join(
            f"  {{\"doctor_id\": {d['doctor_id']}, \"name\": \"{d['full_name']}\", "
            f"\"specialty\": \"{d['specialisation']}\", \"department\": \"{d['department_name']}\"}}"
            for d in doctors
        )
        system_prompt = (
            "You are a triage assistant for a clinic. "
            "Given a patient's symptoms and a list of available doctors with their specialties, "
            "return a JSON array of 2-4 recommended doctor_ids ranked best-first, "
            "each with a 1-sentence reason a layperson can understand. "
            "Never diagnose. Never prescribe. "
            "If symptoms suggest emergency (chest pain with sweating, stroke signs, "
            "severe bleeding, difficulty breathing), set \"emergency\": true. "
            "Respond with ONLY valid JSON of shape: "
            "{\"emergency\": bool, \"recommendations\": [{\"doctor_id\": int, \"reason\": str}]}"
        )
        prompt = (
            f"{system_prompt}\n\n"
            f"Patient symptoms: {symptoms}\n\n"
            f"Available doctors:\n{doctor_list_text}"
        )

        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
            request_options={"timeout": 5},
        )
        raw = response.text.strip()
        logger.info("Gemini raw response length: %d chars", len(raw))  # no PHI in log

        parsed = json.loads(raw)
        emergency: bool = bool(parsed.get("emergency", False))
        recommendations = parsed.get("recommendations", [])

        # Merge reasons into doctor objects
        doc_map = {d["doctor_id"]: d for d in doctors}
        annotated = []
        for rec in recommendations:
            did = rec.get("doctor_id")
            if did in doc_map:
                annotated.append({**doc_map[did], "reason": rec.get("reason", "")})
        return annotated, emergency

    except Exception as exc:
        logger.warning("Gemini call failed (%s), falling back to keyword routing.", exc)
        return None


@router.post("/appointments/suggest-doctor")
def suggest_doctor(
    data: SymptomsRequest,
    current_user: dict = Depends(get_current_user(["PATIENT"])),
    db: oracledb.Connection = Depends(get_db),
):
    if not data.symptoms or not data.symptoms.strip():
        raise HTTPException(400, "Please describe your symptoms.")

    # Load all active doctors
    with db.cursor() as cursor:
        cursor.execute("""
            SELECT d.doctor_id, d.full_name, d.specialisation, d.qualification,
                   d.years_of_experience, d.consultation_fee,
                   dep.name AS department_name, dep.department_id
            FROM DOCTOR d
            JOIN DEPARTMENT dep ON d.department_id = dep.department_id
            WHERE d.is_deleted = 0
            ORDER BY dep.name, d.full_name
        """)
        cols = [c[0].lower() for c in cursor.description]
        doctors = [dict(zip(cols, row)) for row in cursor.fetchall()]

    if not doctors:
        raise HTTPException(503, "No doctors available at this time.")

    # Try Gemini first; fall back to keyword map on any failure
    gemini_result = _call_gemini(data.symptoms, doctors)
    if gemini_result:
        ranked_doctors, emergency = gemini_result
    else:
        ranked_doctors, emergency = _keyword_fallback(data.symptoms, doctors)

    # Compute free slots for ranked doctors
    doctor_ids = [d["doctor_id"] for d in ranked_doctors]
    free_slots = _get_free_slots(db, doctor_ids)

    recommendations = [
        {
            "doctor_id": d["doctor_id"],
            "full_name": d["full_name"],
            "specialisation": d["specialisation"],
            "qualification": d["qualification"],
            "department_name": d["department_name"],
            "consultation_fee": d["consultation_fee"],
            "reason": d.get("reason", f"Specializes in {d['specialisation']} conditions."),
            "next_slots": free_slots.get(d["doctor_id"], []),
        }
        for d in ranked_doctors
    ]

    return format_envelope(True, data={
        "emergency": emergency,
        "recommendations": recommendations,
    })
