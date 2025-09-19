export const DEPARTMENTS = [
  { value: 'automobile_engineering', label: 'Automobile Engineering' },
  { value: 'civil_engineering', label: 'Civil Engineering' },
  { value: 'mechanical_engineering', label: 'Mechanical Engineering' },
  { value: 'electrical_and_electronics_engineering', label: 'Electrical and Electronics Engineering' },
  { value: 'electronics_and_communication_engineering', label: 'Electronics and Communication Engineering' },
  { value: 'vlsi', label: 'VLSI' },
  { value: 'advanced_communication_technology', label: 'Advanced Communication Technology' },
  { value: 'artificial_intelligence_and_data_science', label: 'Artificial Intelligence and Data Science' },
  { value: 'computer_science_and_engineering', label: 'Computer Science and Engineering' },
  { value: 'artificial_intelligence_and_machine_learning', label: 'Artificial Intelligence and Machine Learning' },
  { value: 'cse_cybersecurity', label: 'CSE (Cybersecurity)' },
  { value: 'information_technology', label: 'Information Technology' },
  { value: 'computer_application_mca', label: 'Computer Application (MCA)' },
  { value: 'science_and_humanities', label: 'Science and Humanities' },
  { value: 'me_applied_electronics', label: 'M.E. Applied Electronics' },
  { value: 'me_cad_cam', label: 'M.E. CAD / CAM' },
  { value: 'me_computer_science_and_engineer', label: 'M.E. Computer Science and Engineer' },
  { value: 'me_communication_systems', label: 'M.E. Communication Systems' },
  { value: 'me_structural_engineer', label: 'M.E. Structural Engineer' },
] as const;

export type DepartmentValue = typeof DEPARTMENTS[number]['value'];