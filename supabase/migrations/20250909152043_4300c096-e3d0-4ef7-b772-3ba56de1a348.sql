-- Update department enum with new values
ALTER TYPE department_name ADD VALUE 'automobile_engineering';
ALTER TYPE department_name ADD VALUE 'vlsi';
ALTER TYPE department_name ADD VALUE 'advanced_communication_technology';
ALTER TYPE department_name ADD VALUE 'artificial_intelligence_and_data_science';
ALTER TYPE department_name ADD VALUE 'artificial_intelligence_and_machine_learning';
ALTER TYPE department_name ADD VALUE 'cse_cybersecurity';
ALTER TYPE department_name ADD VALUE 'computer_application_mca';
ALTER TYPE department_name ADD VALUE 'science_and_humanities';
ALTER TYPE department_name ADD VALUE 'me_applied_electronics';
ALTER TYPE department_name ADD VALUE 'me_cad_cam';
ALTER TYPE department_name ADD VALUE 'me_computer_science_and_engineer';
ALTER TYPE department_name ADD VALUE 'me_communication_systems';
ALTER TYPE department_name ADD VALUE 'me_structural_engineer';

-- Rename existing values to match new naming convention
UPDATE profiles SET department = 'civil_engineering' WHERE department = 'civil';
UPDATE profiles SET department = 'mechanical_engineering' WHERE department = 'mechanical';
UPDATE profiles SET department = 'electrical_and_electronics_engineering' WHERE department = 'electrical';
UPDATE profiles SET department = 'electronics_and_communication_engineering' WHERE department = 'electronics';
UPDATE profiles SET department = 'computer_science_and_engineering' WHERE department = 'computer_science';
UPDATE profiles SET department = 'information_technology' WHERE department = 'information_technology';

-- Note: We cannot remove old enum values in PostgreSQL, but we can update existing data to use new values