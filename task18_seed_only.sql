SET DEFINE OFF
SET FEEDBACK ON

-- =============================================================
-- SEED ONLY: Lab Test Catalogue + Pharmacy Items
-- Run this if task18_extended_schema.sql was interrupted
-- after the DDL (tables/VPD already created).
-- =============================================================

-- Lab tests (20 rows)
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Complete Blood Count','CBC','HAEMATOLOGY','Full blood panel: RBC, WBC, platelets, haemoglobin, haematocrit',250,6,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Liver Function Test','LFT','BIOCHEMISTRY','ALT, AST, ALP, bilirubin, albumin, total protein',450,12,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Kidney Function Test','KFT','BIOCHEMISTRY','Creatinine, BUN, uric acid, electrolytes',400,12,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Lipid Profile','LIPID','BIOCHEMISTRY','Total cholesterol, LDL, HDL, triglycerides',350,12,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('HbA1c','HBA1C','BIOCHEMISTRY','Glycated haemoglobin - 3-month average blood glucose',300,6,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Fasting Blood Sugar','FBS','BIOCHEMISTRY','Plasma glucose after 8-hour fast',80,2,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Thyroid Function Test','TFT','BIOCHEMISTRY','TSH, T3, T4 levels',500,24,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Urine Routine and Microscopy','URM','PATHOLOGY','Urine physical, chemical and microscopic examination',120,4,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('ECG','ECG','CARDIOLOGY','12-lead electrocardiogram',200,1,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('2D Echocardiogram','ECHO','CARDIOLOGY','Ultrasound imaging of the heart',1800,2,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Chest X-Ray','CXR','RADIOLOGY','PA view chest radiograph',350,2,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('X-Ray Knee Bilateral','XRAY-KNEE','RADIOLOGY','Weight-bearing AP and lateral views bilateral knees',400,2,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('MRI Lumbar Spine','MRI-LS','RADIOLOGY','MRI of lumbar spine with and without contrast',3500,4,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Serum Ferritin','FERRITIN','BIOCHEMISTRY','Iron storage protein - marker for iron deficiency',280,12,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Vitamin D 25-OH','VITD','BIOCHEMISTRY','Serum 25-hydroxyvitamin D level',600,24,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Blood Culture','BLDCX','MICROBIOLOGY','Aerobic and anaerobic blood culture for bacteraemia',700,48,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Urine Culture and Sensitivity','URICX','MICROBIOLOGY','Mid-stream urine culture with antibiotic sensitivity',350,48,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Dengue NS1 IgM IgG','DENGUE','IMMUNOLOGY','Dengue rapid antigen and antibody combo test',600,3,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('COVID-19 RT-PCR','COVPCR','MICROBIOLOGY','SARS-CoV-2 RT-PCR from nasopharyngeal swab',800,6,1,'SYSTEM');
INSERT INTO LAB_TEST_CATALOGUE (test_name,test_code,category,description,price,turnaround_hours,is_active,created_by) VALUES ('Holter Monitor 24hr','HOLTER','CARDIOLOGY','24-hour ambulatory ECG monitoring',2200,24,1,'SYSTEM');
COMMIT;

-- Pharmacy items (25 rows)
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Metformin 500mg','Metformin Hydrochloride','Sun Pharma','TABLET',3.50,500,50,DATE '2026-12-31','MF500-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Metformin 1000mg','Metformin Hydrochloride','Sun Pharma','TABLET',6.00,400,50,DATE '2026-12-31','MF1000-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Glimepiride 2mg','Glimepiride','Cipla','TABLET',8.00,300,30,DATE '2026-11-30','GL2-2024B',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Metoprolol 25mg','Metoprolol Succinate','AstraZeneca','TABLET',7.50,250,30,DATE '2026-10-31','MT25-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Aspirin 75mg','Acetylsalicylic Acid','Bayer','TABLET',2.00,600,100,DATE '2027-03-31','ASP75-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Atorvastatin 40mg','Atorvastatin Calcium','Pfizer','TABLET',12.00,350,50,DATE '2026-09-30','AT40-2024B',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Isosorbide Mononitrate 20mg','Isosorbide Mononitrate','Lupin','TABLET',5.50,200,20,DATE '2026-08-31','ISMN20-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Furosemide 40mg','Furosemide','Cipla','TABLET',4.00,300,30,DATE '2026-12-31','FUR40-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Ramipril 5mg','Ramipril','Sanofi','TABLET',9.00,250,25,DATE '2026-11-30','RAM5-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Spironolactone 25mg','Spironolactone','Pfizer','TABLET',11.00,150,20,DATE '2026-10-31','SP25-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Ferrous Sulfate 150mg','Ferrous Sulfate','Mankind','TABLET',3.00,400,50,DATE '2027-06-30','FES150-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Folic Acid 5mg','Folic Acid','Alkem','TABLET',1.50,500,50,DATE '2027-06-30','FA5-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Diclofenac 50mg','Diclofenac Sodium','Novartis','TABLET',4.50,350,50,DATE '2026-07-31','DIC50-2024B',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Pantoprazole 40mg','Pantoprazole Sodium','Sun Pharma','TABLET',5.00,400,50,DATE '2026-09-30','PAN40-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Calcium and Vit D3','Calcium Carbonate + Cholecalciferol','Pfizer','TABLET',8.50,200,20,DATE '2026-12-31','CAVD-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Pregabalin 75mg','Pregabalin','Pfizer','CAPSULE',18.00,200,20,DATE '2026-10-31','PRG75-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Vildagliptin 50mg','Vildagliptin','Novartis','TABLET',22.00,150,20,DATE '2026-11-30','VIL50-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Cetirizine 10mg','Cetirizine Hydrochloride','Cipla','TABLET',2.50,300,30,DATE '2027-01-31','CET10-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Azithromycin 500mg','Azithromycin','Cipla','TABLET',28.00,120,20,DATE '2026-08-31','AZI500-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Paracetamol 650mg','Paracetamol','GSK','TABLET',2.00,800,100,DATE '2027-03-31','PCM650-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Salbutamol Inhaler 100mcg','Salbutamol Sulphate','GSK','INHALER',185.00,50,10,DATE '2026-06-30','SAL-INH-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Amlodipine 5mg','Amlodipine Besylate','Pfizer','TABLET',6.50,280,30,DATE '2026-12-31','AML5-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Omeprazole 20mg','Omeprazole','AstraZeneca','CAPSULE',4.00,350,50,DATE '2026-10-31','OMP20-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Losartan 50mg','Losartan Potassium','Merck','TABLET',10.00,220,25,DATE '2026-09-30','LOS50-2024A',1,'SYSTEM');
INSERT INTO PHARMACY_ITEM (medicine_name,generic_name,manufacturer,category,unit_price,stock_quantity,reorder_level,expiry_date,batch_number,is_active,created_by) VALUES ('Insulin Glargine 100IU/ml','Insulin Glargine','Sanofi','INJECTION',650.00,30,5,DATE '2026-04-30','INGLA-2024A',1,'SYSTEM');
COMMIT;

-- Verify
SELECT 'LAB_TEST_CATALOGUE' AS tbl, COUNT(*) AS cnt FROM LAB_TEST_CATALOGUE
UNION ALL SELECT 'PHARMACY_ITEM', COUNT(*) FROM PHARMACY_ITEM;
-- Expected: 20 and 25