-- Add CognitoForms specific fields to deals
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cognito_entry_id TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cognito_form_id TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS cognito_entry_number INTEGER;

-- Unique index/constraint for entry id to prevent duplicates
CREATE INDEX IF NOT EXISTS idx_deals_cognito_entry_id ON public.deals(cognito_entry_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_cognito_entry' 
      AND conrelid = 'public.deals'::regclass
  ) THEN
    ALTER TABLE public.deals ADD CONSTRAINT unique_cognito_entry UNIQUE (cognito_entry_id);
  END IF;
END $$;

-- Insert 50 sample test data (aligned with existing columns)
INSERT INTO public.deals (
  legal_company_name, loan_amount_sought, client_email, client_phone, status, created_at, source, raw_email
) VALUES
('Acme Manufacturing LLC', 250000, 'contact@acmemanufacturing.com', '(555) 123-4567', 'New', NOW() - INTERVAL '1 day', 'test_data', '{"industry":"Manufacturing"}'),
('Sunshine Bakery Inc', 75000, 'info@sunshinebakery.com', '(555) 234-5678', 'Contacted', NOW() - INTERVAL '2 days', 'test_data', '{"industry":"Food Service"}'),
('TechStart Solutions', 500000, 'founders@techstart.io', '(555) 345-6789', 'Qualified', NOW() - INTERVAL '3 days', 'test_data', '{"industry":"Technology"}'),
('Green Energy Systems', 1200000, 'admin@greenenergy.com', '(555) 456-7890', 'Documentation', NOW() - INTERVAL '4 days', 'test_data', '{"industry":"Energy"}'),
('Metro Construction Co', 800000, 'office@metroconstruction.com', '(555) 567-8901', 'Underwriting', NOW() - INTERVAL '5 days', 'test_data', '{"industry":"Construction"}'),
('Digital Marketing Pro', 150000, 'hello@digitalmarketingpro.com', '(555) 678-9012', 'Approved', NOW() - INTERVAL '6 days', 'test_data', '{"industry":"Marketing"}'),
('Coastal Seafood LLC', 300000, 'sales@coastalseafood.com', '(555) 789-0123', 'Funded', NOW() - INTERVAL '7 days', 'test_data', '{"industry":"Food Distribution"}'),
('Urban Fitness Center', 200000, 'manager@urbanfitness.com', '(555) 890-1234', 'Declined', NOW() - INTERVAL '8 days', 'test_data', '{"industry":"Fitness"}'),
('Premier Auto Repair', 125000, 'service@premierauto.com', '(555) 901-2345', 'New', NOW() - INTERVAL '9 days', 'test_data', '{"industry":"Automotive"}'),
('Elegant Events Planning', 90000, 'events@elegantevents.com', '(555) 012-3456', 'Contacted', NOW() - INTERVAL '10 days', 'test_data', '{"industry":"Event Planning"}'),
('Mountain View Logistics', 650000, 'dispatch@mountainlogistics.com', '(555) 123-7890', 'Qualified', NOW() - INTERVAL '11 days', 'test_data', '{"industry":"Logistics"}'),
('Creative Design Studio', 85000, 'studio@creativedesign.com', '(555) 234-8901', 'Documentation', NOW() - INTERVAL '12 days', 'test_data', '{"industry":"Design"}'),
('Reliable Plumbing Services', 110000, 'office@reliableplumbing.com', '(555) 345-9012', 'New', NOW() - INTERVAL '13 days', 'test_data', '{"industry":"Plumbing"}'),
('Fresh Farm Produce', 180000, 'orders@freshfarm.com', '(555) 456-0123', 'Contacted', NOW() - INTERVAL '14 days', 'test_data', '{"industry":"Agriculture"}'),
('Elite Security Solutions', 320000, 'info@elitesecurity.com', '(555) 567-1234', 'Qualified', NOW() - INTERVAL '15 days', 'test_data', '{"industry":"Security"}'),
('Bright Dental Practice', 140000, 'reception@brightdental.com', '(555) 678-2345', 'Underwriting', NOW() - INTERVAL '16 days', 'test_data', '{"industry":"Healthcare"}'),
('Rapid Delivery Express', 280000, 'dispatch@rapiddelivery.com', '(555) 789-3456', 'Approved', NOW() - INTERVAL '17 days', 'test_data', '{"industry":"Delivery"}'),
('Artisan Coffee Roasters', 95000, 'roastery@artisancoffee.com', '(555) 890-4567', 'Funded', NOW() - INTERVAL '18 days', 'test_data', '{"industry":"Food & Beverage"}'),
('Professional Cleaning Co', 70000, 'bookings@professionalcleaning.com', '(555) 901-5678', 'New', NOW() - INTERVAL '19 days', 'test_data', '{"industry":"Cleaning Services"}'),
('Smart Home Solutions', 450000, 'sales@smarthome.com', '(555) 012-6789', 'Contacted', NOW() - INTERVAL '20 days', 'test_data', '{"industry":"Home Automation"}'),
('Vintage Furniture Restore', 60000, 'workshop@vintagefurniture.com', '(555) 123-4321', 'Qualified', NOW() - INTERVAL '21 days', 'test_data', '{"industry":"Furniture"}'),
('Express Legal Services', 120000, 'attorneys@expresslegal.com', '(555) 234-5432', 'Documentation', NOW() - INTERVAL '22 days', 'test_data', '{"industry":"Legal Services"}'),
('Golden Years Care', 380000, 'admin@goldenyearscare.com', '(555) 345-6543', 'Underwriting', NOW() - INTERVAL '23 days', 'test_data', '{"industry":"Senior Care"}'),
('Precision Machining LLC', 550000, 'quotes@precisionmachining.com', '(555) 456-7654', 'Approved', NOW() - INTERVAL '24 days', 'test_data', '{"industry":"Manufacturing"}'),
('Neighborhood Pet Clinic', 160000, 'appointments@petclinic.com', '(555) 567-8765', 'Funded', NOW() - INTERVAL '25 days', 'test_data', '{"industry":"Veterinary"}'),
('Innovative Web Design', 105000, 'projects@innovativeweb.com', '(555) 678-9876', 'Declined', NOW() - INTERVAL '26 days', 'test_data', '{"industry":"Web Design"}'),
('Quality Landscaping', 190000, 'estimates@qualitylandscaping.com', '(555) 789-0987', 'New', NOW() - INTERVAL '27 days', 'test_data', '{"industry":"Landscaping"}'),
('Downtown Pharmacy', 85000, 'prescriptions@downtownpharmacy.com', '(555) 890-1098', 'Contacted', NOW() - INTERVAL '28 days', 'test_data', '{"industry":"Pharmacy"}'),
('Elite Training Academy', 220000, 'enrollment@elitetraining.com', '(555) 901-2109', 'Qualified', NOW() - INTERVAL '29 days', 'test_data', '{"industry":"Education"}'),
('Gourmet Catering Services', 135000, 'events@gourmetcatering.com', '(555) 012-3210', 'Documentation', NOW() - INTERVAL '30 days', 'test_data', '{"industry":"Catering"}'),
('Advanced IT Solutions', 420000, 'support@advancedit.com', '(555) 111-2222', 'Underwriting', NOW() - INTERVAL '31 days', 'test_data', '{"industry":"IT Services"}'),
('Luxury Car Detailing', 75000, 'bookings@luxurydetailing.com', '(555) 222-3333', 'Approved', NOW() - INTERVAL '32 days', 'test_data', '{"industry":"Automotive Services"}'),
('Organic Health Foods', 165000, 'wholesale@organichealth.com', '(555) 333-4444', 'Funded', NOW() - INTERVAL '33 days', 'test_data', '{"industry":"Health Foods"}'),
('Premier Real Estate', 890000, 'agents@premierrealestate.com', '(555) 444-5555', 'New', NOW() - INTERVAL '34 days', 'test_data', '{"industry":"Real Estate"}'),
('Skilled Electricians Inc', 240000, 'service@skilledelectricians.com', '(555) 555-6666', 'Contacted', NOW() - INTERVAL '35 days', 'test_data', '{"industry":"Electrical Services"}'),
('Modern Hair Salon', 65000, 'appointments@modernhair.com', '(555) 666-7777', 'Qualified', NOW() - INTERVAL '36 days', 'test_data', '{"industry":"Beauty Services"}'),
('Reliable HVAC Systems', 310000, 'service@reliablehvac.com', '(555) 777-8888', 'Documentation', NOW() - INTERVAL '37 days', 'test_data', '{"industry":"HVAC"}'),
('Creative Photography', 45000, 'bookings@creativephoto.com', '(555) 888-9999', 'Underwriting', NOW() - INTERVAL '38 days', 'test_data', '{"industry":"Photography"}'),
('Express Courier Service', 180000, 'dispatch@expresscourier.com', '(555) 999-0000', 'Approved', NOW() - INTERVAL '39 days', 'test_data', '{"industry":"Courier Services"}'),
('Boutique Fashion Store', 120000, 'orders@boutiquefashion.com', '(555) 000-1111', 'Funded', NOW() - INTERVAL '40 days', 'test_data', '{"industry":"Fashion Retail"}'),
('Professional Accounting', 95000, 'clients@professionalaccounting.com', '(555) 111-0000', 'Declined', NOW() - INTERVAL '41 days', 'test_data', '{"industry":"Accounting"}'),
('Specialty Coffee Shop', 85000, 'orders@specialtycoffee.com', '(555) 222-1111', 'New', NOW() - INTERVAL '42 days', 'test_data', '{"industry":"Coffee Shop"}'),
('Mobile App Development', 380000, 'projects@mobileappdev.com', '(555) 333-2222', 'Contacted', NOW() - INTERVAL '43 days', 'test_data', '{"industry":"App Development"}'),
('Family Dental Care', 210000, 'reception@familydental.com', '(555) 444-3333', 'Qualified', NOW() - INTERVAL '44 days', 'test_data', '{"industry":"Dental Care"}'),
('Eco-Friendly Packaging', 275000, 'sales@ecopackaging.com', '(555) 555-4444', 'Documentation', NOW() - INTERVAL '45 days', 'test_data', '{"industry":"Packaging"}'),
('Personal Training Studio', 90000, 'trainers@personaltraining.com', '(555) 666-5555', 'Underwriting', NOW() - INTERVAL '46 days', 'test_data', '{"industry":"Fitness Training"}'),
('Artisan Jewelry Design', 55000, 'custom@artisanjewelry.com', '(555) 777-6666', 'Approved', NOW() - INTERVAL '47 days', 'test_data', '{"industry":"Jewelry"}'),
('Commercial Printing Co', 195000, 'orders@commercialprinting.com', '(555) 888-7777', 'Funded', NOW() - INTERVAL '48 days', 'test_data', '{"industry":"Printing"}'),
('Wellness Spa Retreat', 145000, 'bookings@wellnessspa.com', '(555) 999-8888', 'New', NOW() - INTERVAL '49 days', 'test_data', '{"industry":"Wellness"}'),
('Industrial Supply Co', 520000, 'procurement@industrialsupply.com', '(555) 000-9999', 'Contacted', NOW() - INTERVAL '50 days', 'test_data', '{"industry":"Industrial Supply"}')
ON CONFLICT (cognito_entry_id) DO NOTHING;