-- Students: Revert mobileNumbers to mobileNumber (take first element)
ALTER TABLE students ADD COLUMN "temp_mobileNumber" text;
UPDATE students SET "temp_mobileNumber" = "mobileNumbers"[1] WHERE array_length("mobileNumbers", 1) > 0;
ALTER TABLE students DROP COLUMN "mobileNumbers";
ALTER TABLE students RENAME COLUMN "temp_mobileNumber" TO "mobileNumber";

-- Students: Move guardianPhone to guardianPhones (array)
ALTER TABLE students ADD COLUMN "guardianPhones" text[] DEFAULT '{}';
UPDATE students SET "guardianPhones" = ARRAY["guardianPhone"] WHERE "guardianPhone" IS NOT NULL;
ALTER TABLE students DROP COLUMN "guardianPhone";
