-- synthetic data for the employee-permission test
set session_replication_role = replica;
insert into public.patients (full_name, phone, gender, user_id) values
 ('Perm Patient A','0100000301','male',:'owner'),('Perm Patient B','0100000302','female',:'owner'),('Perm Patient C','0100000303','male',:'owner');
insert into public.doctors (user_id, doctor_name, specialization, phone) values
 (:'owner'::uuid,'Perm Doctor A','Ortho','0100000401'),(:'owner'::uuid,'Perm Doctor B','Endo','0100000402');
insert into public.bills (user_id, beneficiary, reason, amount) values
 (:'owner'::uuid,'Perm Beneficiary A','rent',100),(:'owner'::uuid,'Perm Beneficiary B','supplies',250);
insert into public.labs (user_id, lab_name) values (:'owner'::uuid,'Perm Lab A');
with e as (insert into public.employees (owner_id, full_name, email) values
  (:'owner'::uuid,'Emp Three Pages','three@example.test'),
  (:'owner'::uuid,'Emp Patients Only','pat@example.test'),
  (:'owner'::uuid,'Emp Bill Add','billadd@example.test'),
  (:'owner'::uuid,'Emp No Perms','none@example.test') returning id, email)
insert into public.employee_permissions (employee_id, page_key, can_view, can_add, can_edit, can_delete)
select e.id, k, true, false, false, false from e, unnest(array['bill','doctors','patients','patient-file']) k where e.email like 'three%'
union all select e.id, 'patients', true, false, false, false from e where e.email like 'pat%'
union all select e.id, 'bill', true, true, false, false from e where e.email like 'billadd%';
