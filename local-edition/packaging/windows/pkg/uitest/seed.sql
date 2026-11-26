-- synthetic demo data (fake people) for screenshots only; never shipped in the zip
set session_replication_role = replica; -- demo seeding as superuser: skip tenant-link triggers (they need a signed-in user)
insert into public.patients (full_name, phone, gender, address, birth_date, medical_history, dental_history, user_id) values
 ('Omar Hassan','0100000101','male','Cairo, Nasr City','1990-04-12','No chronic conditions','Scaling 2024',:'owner'),
 ('Salma Adel','0100000102','female','Giza, Dokki','1996-09-03','Penicillin allergy','Filling lower right molar',:'owner'),
 ('Youssef Ibrahim','0100000103','male','Cairo, Maadi','1985-01-25','Diabetes type 2','Root canal 2023',:'owner'),
 ('Mariam Khaled','0100000104','female','Giza, Haram','2001-06-18','None','Braces consultation',:'owner'),
 ('Karim Mostafa','0100000105','male','Cairo, Heliopolis','1978-11-30','High blood pressure','Crown upper left',:'owner'),
 ('Nour Samir','0100000106','female','Alexandria, Smouha','1999-02-14','None','Whitening',:'owner'),
 ('Ahmed Fathy','0100000107','male','Cairo, Zamalek','1969-08-08','Heart medication','Dentures review',:'owner'),
 ('Hana Tarek','0100000108','female','Giza, Mohandessin','2010-12-01','None','First visit',:'owner');
insert into public.patient_visits (patient_id, user_id, visit_status, appointment_start, appointment_end, patient_name, patient_phone, patient_age, visit_title)
select p.id, :'owner', 'قادم', date_trunc('day', now()) + ((8 + p.id % 8) || ' hours')::interval, date_trunc('day', now()) + ((8 + p.id % 8) || ' hours 30 minutes')::interval, p.full_name, p.phone, 30, 'Checkup'
from public.patients p;
insert into public.doctors (user_id, doctor_name, specialization, phone) values
 (:'owner'::uuid,'Dr. Laila Nabil','Orthodontics','0100000201'),(:'owner'::uuid,'Dr. Hesham Zaki','Endodontics','0100000202'),(:'owner'::uuid,'Dr. Rania Fouad','General dentistry','0100000203');
insert into public.waiting_list (user_id, patient_id, patient_name, age, phone) select :'owner'::uuid, id, full_name, 30, phone from public.patients where id % 3 = 0;
with e as (insert into public.employees (owner_id, full_name, email) values
  (:'owner'::uuid,'Reception Demo','reception@example.test'),(:'owner'::uuid,'Assistant Demo','assistant@example.test') returning id, email)
insert into public.employee_permissions (employee_id, page_key, can_view, can_add, can_edit, can_delete)
select e.id, k, true, e.email like 'reception%', false, false from e, unnest(array['dashboard','patients','waiting']) k;
