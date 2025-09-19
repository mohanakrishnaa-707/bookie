-- Add new department enum values
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'automobile_engineering';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'civil_engineering';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'mechanical_engineering';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'electrical_and_electronics_engineering';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'electronics_and_communication_engineering';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'vlsi';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'advanced_communication_technology';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'artificial_intelligence_and_data_science';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'computer_science_and_engineering';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'artificial_intelligence_and_machine_learning';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'cse_cybersecurity';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'information_technology';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'computer_application_mca';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'science_and_humanities';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'me_applied_electronics';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'me_cad_cam';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'me_computer_science_and_engineer';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'me_communication_systems';
ALTER TYPE department_name ADD VALUE IF NOT EXISTS 'me_structural_engineer';

-- Update existing data to use new department names
UPDATE profiles SET department = 'civil_engineering' WHERE department = 'civil';
UPDATE profiles SET department = 'mechanical_engineering' WHERE department = 'mechanical';  
UPDATE profiles SET department = 'electrical_and_electronics_engineering' WHERE department = 'electrical';
UPDATE profiles SET department = 'electronics_and_communication_engineering' WHERE department = 'electronics';
UPDATE profiles SET department = 'computer_science_and_engineering' WHERE department = 'computer_science';
UPDATE profiles SET department = 'information_technology' WHERE department = 'information_technology';
UPDATE profiles SET department = 'automobile_engineering' WHERE department = 'biotechnology';
UPDATE profiles SET department = 'civil_engineering' WHERE department = 'chemical';