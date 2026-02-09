-- Insert default system settings
INSERT INTO system_settings (id, settingKey, settingValue, description) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'sla_zamindar_hours', '{"hours": 2}', 'SLA time for Zamindar approval in hours'),
('550e8400-e29b-41d4-a716-446655440001', 'sla_instructor_hours', '{"hours": 4}', 'SLA time for Instructor approval in hours'),
('550e8400-e29b-41d4-a716-446655440002', 'image_retention_months', '{"months": 12}', 'Image retention period in months'),
('550e8400-e29b-41d4-a716-446655440003', 'max_image_size_mb', '{"mb": 10}', 'Maximum image size in MB'),
('550e8400-e29b-41d4-a716-446655440004', 'working_hours_start', '{"time": "06:00"}', 'Facility working hours start'),
('550e8400-e29b-41d4-a716-446655440005', 'working_hours_end', '{"time": "18:00"}', 'Facility working hours end');
