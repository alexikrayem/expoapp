const express = require("express")
const { body, validationResult } = require("express-validator")
const router = express.Router()
const db = require("../config/db")
const logger = require("../services/logger")
const requireCustomer = require("../middleware/requireCustomer")

router.use(requireCustomer)

const HTTP = Object.freeze({
  BAD_REQUEST: Number.parseInt("400", 10),
  NOT_FOUND: Number.parseInt("404", 10),
  INTERNAL_SERVER_ERROR: Number.parseInt("500", 10),
})

const VALIDATION_LIMITS = Object.freeze({
  MAX_NAME_LENGTH: Number.parseInt("100", 10),
  MAX_ADDRESS_LENGTH: Number.parseInt("255", 10),
  MAX_CITY_LENGTH: Number.parseInt("100", 10),
})

const MOBILE_PHONE_LOCALES = [
  "ar-SA",
  "ar-EG",
  "ar-IQ",
  "ar-JO",
  "ar-KW",
  "ar-LB",
  "ar-LY",
  "ar-MA",
  "ar-QA",
  "ar-SY",
  "ar-TN",
  "ar-YE",
  "en-US",
]

const UPSERT_PROFILE_QUERY = `
  INSERT INTO user_profiles (
    user_id, selected_city_id, full_name, phone_number,
    address_line1, address_line2, city, clinic_name, clinic_phone,
    clinic_address_line1, clinic_address_line2, clinic_city, clinic_country,
    clinic_coordinates, clinic_license_number, clinic_specialization,
    professional_role, years_of_experience, education_background,
    date_of_birth, gender, professional_license_number, profile_completed,
    created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4, COALESCE($5, ''), $6, COALESCE($7, ''), $8, $9, $10, $11, $12, $13, $14, $15, $16,
    $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    selected_city_id = COALESCE($2, user_profiles.selected_city_id),
    full_name = COALESCE($3, user_profiles.full_name),
    phone_number = COALESCE($4, user_profiles.phone_number),
    address_line1 = COALESCE($5, user_profiles.address_line1),
    address_line2 = COALESCE($6, user_profiles.address_line2),
    city = COALESCE($7, user_profiles.city),
    clinic_name = COALESCE($8, user_profiles.clinic_name),
    clinic_phone = COALESCE($9, user_profiles.clinic_phone),
    clinic_address_line1 = COALESCE($10, user_profiles.clinic_address_line1),
    clinic_address_line2 = COALESCE($11, user_profiles.clinic_address_line2),
    clinic_city = COALESCE($12, user_profiles.clinic_city),
    clinic_country = COALESCE($13, user_profiles.clinic_country),
    clinic_coordinates = COALESCE($14, user_profiles.clinic_coordinates),
    clinic_license_number = COALESCE($15, user_profiles.clinic_license_number),
    clinic_specialization = COALESCE($16, user_profiles.clinic_specialization),
    professional_role = COALESCE($17, user_profiles.professional_role),
    years_of_experience = COALESCE($18, user_profiles.years_of_experience),
    education_background = COALESCE($19, user_profiles.education_background),
    date_of_birth = COALESCE($20, user_profiles.date_of_birth),
    gender = COALESCE($21, user_profiles.gender),
    professional_license_number = COALESCE($22, user_profiles.professional_license_number),
    profile_completed = $23,
    updated_at = NOW()
  RETURNING *;
`

const PROFILE_BY_USER_ID_QUERY = `
  SELECT up.*, c.name as selected_city_name
  FROM user_profiles up
  LEFT JOIN cities c ON up.selected_city_id = c.id
  WHERE up.user_id = $1
`

const validateProfileUpdate = [
  body("full_name")
    .optional()
    .trim()
    .isLength({ max: VALIDATION_LIMITS.MAX_NAME_LENGTH })
    .withMessage(`Full name must be at most ${VALIDATION_LIMITS.MAX_NAME_LENGTH} characters`)
    .matches(/^[a-zA-Z\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+$/)
    .withMessage("Full name contains invalid characters"),
  body("phone_number")
    .optional()
    .trim()
    .isMobilePhone(MOBILE_PHONE_LOCALES)
    .withMessage("Phone number must be a valid mobile number"),
  body("address_line1")
    .optional()
    .trim()
    .isLength({ max: VALIDATION_LIMITS.MAX_ADDRESS_LENGTH })
    .withMessage(`Address line 1 must be at most ${VALIDATION_LIMITS.MAX_ADDRESS_LENGTH} characters`),
  body("address_line2")
    .optional()
    .trim()
    .isLength({ max: VALIDATION_LIMITS.MAX_ADDRESS_LENGTH })
    .withMessage(`Address line 2 must be at most ${VALIDATION_LIMITS.MAX_ADDRESS_LENGTH} characters`),
  body("city")
    .optional()
    .trim()
    .isLength({ max: VALIDATION_LIMITS.MAX_CITY_LENGTH })
    .withMessage(`City must be at most ${VALIDATION_LIMITS.MAX_CITY_LENGTH} characters`),
  body("selected_city_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Selected city ID must be a valid positive integer"),
]

router.get("/profile", async (req, res) => {
  try {
    const profile = await fetchUserProfileByUserId(req.user.userId)
    if (!profile) {
      return res.status(HTTP.NOT_FOUND).json({ message: "User profile not found." })
    }
    res.json(profile)
  } catch (error) {
    logger.error("Error fetching user profile", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch user profile" })
  }
})

router.put("/profile", validateProfileUpdate, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(HTTP.BAD_REQUEST).json({ error: "Validation failed", details: errors.array() })
    }

    const { userId } = req.user
    await upsertUserProfile(userId, req.body)

    const profile = await fetchUserProfileByUserId(userId)
    res.json(profile)
  } catch (error) {
    logger.error("Error updating user profile", error)
    res.status(HTTP.INTERNAL_SERVER_ERROR).json({ error: "Failed to update user profile" })
  }
})

const firstDefined = (...values) => {
  for (const value of values) {
    if (value !== undefined) {
      return value
    }
  }
  return null
}

const normalizeProfilePayload = (profileData) => ({
  selected_city_id: firstDefined(profileData.selected_city_id),
  full_name: firstDefined(profileData.fullName, profileData.full_name),
  phone_number: firstDefined(profileData.phoneNumber, profileData.phone_number),
  address_line1: firstDefined(profileData.addressLine1, profileData.address_line1),
  address_line2: firstDefined(profileData.addressLine2, profileData.address_line2),
  city: firstDefined(profileData.city),
  clinic_name: firstDefined(profileData.clinic_name),
  clinic_phone: firstDefined(profileData.clinic_phone),
  clinic_address_line1: firstDefined(profileData.clinic_address_line1),
  clinic_address_line2: firstDefined(profileData.clinic_address_line2),
  clinic_city: firstDefined(profileData.clinic_city),
  clinic_country: firstDefined(profileData.clinic_country),
  clinic_coordinates: firstDefined(profileData.clinic_coordinates),
  clinic_license_number: firstDefined(profileData.clinic_license_number),
  clinic_specialization: firstDefined(profileData.clinic_specialization),
  professional_role: firstDefined(profileData.professional_role),
  years_of_experience: firstDefined(profileData.years_of_experience),
  education_background: firstDefined(profileData.education_background),
  date_of_birth: firstDefined(profileData.date_of_birth),
  gender: firstDefined(profileData.gender),
  professional_license_number: firstDefined(profileData.professional_license_number),
})

const hasRequiredProfileFields = (profile) =>
  [
    profile.full_name,
    profile.phone_number,
    profile.clinic_name,
    profile.clinic_phone,
  ].every((value) => String(value || "").trim().length > 0)

const buildUpsertValues = (userId, profile) => [
  userId,
  profile.selected_city_id,
  profile.full_name,
  profile.phone_number,
  profile.address_line1,
  profile.address_line2,
  profile.city,
  profile.clinic_name,
  profile.clinic_phone,
  profile.clinic_address_line1,
  profile.clinic_address_line2,
  profile.clinic_city,
  profile.clinic_country,
  profile.clinic_coordinates,
  profile.clinic_license_number,
  profile.clinic_specialization,
  profile.professional_role,
  profile.years_of_experience,
  profile.education_background,
  profile.date_of_birth,
  profile.gender,
  profile.professional_license_number,
  hasRequiredProfileFields(profile),
]

const upsertUserProfile = async (userId, profileData) => {
  const normalizedProfile = normalizeProfilePayload(profileData)
  const values = buildUpsertValues(userId, normalizedProfile)
  const result = await db.query(UPSERT_PROFILE_QUERY, values)
  return result.rows[0]
}

const fetchUserProfileByUserId = async (userId) => {
  const result = await db.query(PROFILE_BY_USER_ID_QUERY, [userId])
  return result.rows[0] || null
}

module.exports = router
