/**
 * XMiso GMB Scraper Categories and Configuration
 * 
 * Based on: https://apify.com/xmiso_scrapers/millions-us-businesses-leads-with-emails-from-google-maps/input-schema
 */

// Supported countries for xmiso scraper
export const XMISO_COUNTRIES = [
  { code: 'ALL', name: 'All Countries' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'DK', name: 'Denmark' },
  { code: 'ES', name: 'Spain' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IN', name: 'India' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SE', name: 'Sweden' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Turkey' },
] as const;

export type XmisoCountryCode = typeof XMISO_COUNTRIES[number]['code'];

// US States for xmiso scraper
export const XMISO_US_STATES = [
  { code: 'All', name: 'All States' },
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const;

export type XmisoStateCode = typeof XMISO_US_STATES[number]['code'];

// Popular categories for quick selection (subset of the full list)
export const XMISO_POPULAR_CATEGORIES = [
  'accountant',
  'auto_repair_shop',
  'bakery',
  'bank',
  'bar',
  'beauty_salon',
  'car_dealer',
  'car_wash',
  'chiropractor',
  'coffee_shop',
  'construction_company',
  'contractor',
  'convenience_store',
  'day_spa',
  'dentist',
  'doctor',
  'electrician',
  'fitness_center',
  'florist',
  'furniture_store',
  'gas_station',
  'general_contractor',
  'gym',
  'hair_salon',
  'hardware_store',
  'heating_contractor',
  'home_builder',
  'hotel',
  'hvac_contractor',
  'insurance_agency',
  'jewelry_store',
  'landscaper',
  'laundromat',
  'lawyer',
  'liquor_store',
  'locksmith',
  'medical_clinic',
  'moving_company',
  'nail_salon',
  'optometrist',
  'painter',
  'pest_control_service',
  'pet_groomer',
  'pharmacy',
  'photographer',
  'physical_therapist',
  'pizza_restaurant',
  'plumber',
  'printing_service',
  'property_management_company',
  'real_estate_agency',
  'restaurant',
  'roofing_contractor',
  'school',
  'shoe_store',
  'storage_facility',
  'supermarket',
  'tattoo_shop',
  'tire_shop',
  'travel_agency',
  'veterinarian',
  'wedding_planner',
];

// Full list of xmiso categories (just the most common ones for UI)
// The API accepts any string as keyword, so these are just suggestions
export const XMISO_CATEGORIES = [
  'abortion_clinic', 'accountant', 'acupuncturist', 'adult_entertainment_club',
  'advertising_agency', 'air_conditioning_contractor', 'aircraft_dealer', 'airline',
  'airport', 'ambulance_service', 'amusement_park', 'animal_hospital',
  'antique_store', 'apartment_building', 'apartment_complex', 'appliance_repair_service',
  'appliance_store', 'aquarium', 'arcade', 'architect',
  'art_gallery', 'arts_organization', 'asian_restaurant', 'assisted_living_facility',
  'athletic_field', 'atm', 'attorney', 'auction_house',
  'auto_body_shop', 'auto_glass_shop', 'auto_insurance_agency', 'auto_parts_store',
  'auto_repair_shop', 'baby_store', 'bagel_shop', 'bail_bond_service',
  'bakery', 'bank', 'banquet_hall', 'bar',
  'barber_shop', 'basketball_court', 'bathroom_remodeler', 'battery_store',
  'beauty_salon', 'beauty_supply_store', 'bed_and_breakfast', 'beer_distributor',
  'bicycle_repair_shop', 'bicycle_store', 'blinds_shop', 'blood_bank',
  'boat_dealer', 'boat_repair_shop', 'book_store', 'bowling_alley',
  'boxing_gym', 'bridal_shop', 'building_materials_store', 'burglar_alarm_store',
  'bus_station', 'business_management_consultant', 'butcher_shop', 'cafe',
  'cake_shop', 'campground', 'candy_store', 'car_dealer',
  'car_detailing_service', 'car_rental_agency', 'car_wash', 'career_counselor',
  'carpet_cleaning_service', 'carpet_store', 'casino', 'catering_service',
  'cell_phone_store', 'cemetery', 'charter_bus_company', 'cheese_shop',
  'child_care_agency', 'chiropractor', 'chocolate_shop', 'church',
  'city_hall', 'cleaning_service', 'clothing_store', 'coffee_shop',
  'coin_dealer', 'college', 'comic_book_store', 'commercial_printer',
  'commercial_real_estate_agency', 'community_center', 'computer_repair_service', 'computer_store',
  'concrete_contractor', 'construction_company', 'consultant', 'convenience_store',
  'convention_center', 'copy_shop', 'corporate_office', 'cosmetic_dentist',
  'cosmetics_store', 'costume_store', 'country_club', 'courier_service',
  'court_house', 'credit_counseling_service', 'credit_union', 'cremation_service',
  'dance_school', 'day_care_center', 'day_spa', 'deli',
  'demolition_contractor', 'dental_clinic', 'dentist', 'department_store',
  'dermatologist', 'dessert_shop', 'diagnostic_center', 'diamond_buyer',
  'diet_food_store', 'diner', 'disability_services_organization', 'discount_store',
  'diving_center', 'doctor', 'dog_park', 'dog_trainer',
  'dollar_store', 'donut_shop', 'door_supplier', 'driving_school',
  'drug_store', 'dry_cleaner', 'dumpster_rental_service', 'education_center',
  'electrician', 'electronics_store', 'elementary_school', 'elevator_service',
  'embroidery_shop', 'emergency_room', 'employment_agency', 'engineer',
  'entertainment_agency', 'equipment_rental_agency', 'escape_room_center', 'estate_planning_attorney',
  'ethnic_restaurant', 'event_planner', 'event_venue', 'excavating_contractor',
  'extended_stay_hotel', 'eyebrow_bar', 'fabric_store', 'family_counselor',
  'family_practice_physician', 'family_restaurant', 'farm', 'farm_equipment_dealer',
  'fashion_accessories_store', 'fast_food_restaurant', 'fencing_contractor', 'fertility_clinic',
  'financial_planner', 'fire_department', 'fireplace_store', 'firewood_supplier',
  'fish_market', 'fishing_store', 'fitness_center', 'flea_market',
  'flight_school', 'floor_refinishing_service', 'flooring_contractor', 'flooring_store',
  'florist', 'food_truck', 'formal_wear_store', 'foster_care_service',
  'freight_forwarding_service', 'frozen_yogurt_shop', 'fruit_and_vegetable_store', 'funeral_home',
  'furniture_store', 'garage_builder', 'garage_door_supplier', 'garbage_collection_service',
  'garden_center', 'gas_station', 'gastropub', 'general_contractor',
  'general_practice_attorney', 'general_store', 'gift_shop', 'glass_shop',
  'golf_course', 'golf_shop', 'granite_supplier', 'graphic_designer',
  'greenhouse', 'grocery_store', 'gun_shop', 'gutters_contractor',
  'gym', 'gymnasium', 'gynecologist', 'hair_salon',
  'halal_restaurant', 'handicraft', 'handyman', 'hardware_store',
  'hat_shop', 'health_food_store', 'health_insurance_agency', 'hearing_aid_store',
  'heating_contractor', 'helicopter_tour_agency', 'high_school', 'hobby_store',
  'hockey_field', 'home_builder', 'home_goods_store', 'home_health_care_service',
  'home_improvement_store', 'home_inspector', 'hospice', 'hospital',
  'hostel', 'hot_dog_stand', 'hot_tub_store', 'hotel',
  'house_cleaning_service', 'housing_authority', 'housing_development', 'hvac_contractor',
  'ice_cream_shop', 'ice_skating_rink', 'immigration_attorney', 'import_export_company',
  'indian_restaurant', 'indoor_playground', 'insurance_agency', 'interior_designer',
  'internet_cafe', 'italian_restaurant', 'janitorial_service', 'japanese_restaurant',
  'jazz_club', 'jewelry_repair_service', 'jewelry_store', 'junk_dealer',
  'karaoke', 'kennel', 'key_shop', 'kitchen_remodeler',
  'korean_restaurant', 'laboratory', 'landscaper', 'laser_hair_removal_service',
  'laundromat', 'laundry_service', 'lawn_care_service', 'lawyer',
  'leather_goods_store', 'library', 'life_coach', 'life_insurance_agency',
  'lighting_store', 'limousine_service', 'lingerie_store', 'liquor_store',
  'loan_agency', 'locksmith', 'lodging', 'logistics_service',
  'lottery_retailer', 'luggage_store', 'lumber_store', 'machine_shop',
  'magician', 'maid_service', 'mailbox_rental_service', 'makeup_artist',
  'management_school', 'manufacturer', 'marble_supplier', 'marina',
  'market', 'marketing_agency', 'marriage_counselor', 'martial_arts_school',
  'masonry_contractor', 'massage_spa', 'massage_therapist', 'mattress_store',
  'meat_packer', 'mechanic', 'medical_center', 'medical_clinic',
  'medical_equipment_supplier', 'medical_lab', 'medical_spa', 'meditation_center',
  'memorial_park', 'mens_clothing_store', 'mental_health_clinic', 'metal_fabricator',
  'mexican_restaurant', 'middle_school', 'midwife', 'military_base',
  'mobile_home_dealer', 'mobile_phone_repair_shop', 'model_agency', 'modeling_school',
  'money_transfer_service', 'montessori_school', 'mortgage_broker', 'motel',
  'motorcycle_dealer', 'motorcycle_repair_shop', 'movie_theater', 'moving_company',
  'muffler_shop', 'museum', 'music_school', 'music_store',
  'nail_salon', 'nanny_service', 'natural_goods_store', 'naturopath',
  'neurologist', 'new_age_church', 'newspaper_publisher', 'night_club',
  'non_profit_organization', 'notary_public', 'nuclear_power_plant', 'nursery_school',
  'nursing_home', 'nutritionist', 'obstetrician_gynecologist', 'occupational_therapist',
  'office_equipment_supplier', 'office_furniture_store', 'office_space_rental_agency', 'oil_change_service',
  'oncologist', 'ophthalmologist', 'optician', 'optometrist',
  'oral_surgeon', 'organic_food_store', 'organic_restaurant', 'orthodontist',
  'orthopedic_surgeon', 'osteopath', 'outdoor_furniture_store', 'outlet_store',
  'package_delivery_service', 'packing_supply_store', 'pain_management_physician', 'paint_store',
  'painter', 'pakistani_restaurant', 'paper_store', 'park',
  'parking_garage', 'party_planner', 'party_store', 'passport_office',
  'pastry_shop', 'patio_enclosure_supplier', 'paving_contractor', 'pawn_shop',
  'pediatric_dentist', 'pediatrician', 'pension_office', 'performing_arts_theater',
  'perfume_store', 'personal_injury_attorney', 'personal_trainer', 'pest_control_service',
  'pet_adoption_service', 'pet_groomer', 'pet_sitter', 'pet_store',
  'petroleum_products_company', 'pharmacy', 'photo_booth', 'photo_lab',
  'photographer', 'physical_fitness_program', 'physical_therapist', 'piano_store',
  'picture_framing_service', 'pie_shop', 'pilates_studio', 'pizza_delivery',
  'pizza_restaurant', 'place_of_worship', 'planetarium', 'plastic_surgeon',
  'playground', 'plumber', 'podiatrist', 'poker_club',
  'police_department', 'polish_restaurant', 'political_party_office', 'pool_cleaning_service',
  'pool_hall', 'popcorn_store', 'portrait_studio', 'post_office',
  'pottery_store', 'power_plant', 'preschool', 'pressure_washing_service',
  'printing_service', 'private_investigator', 'private_school', 'probation_office',
  'produce_market', 'propane_supplier', 'property_management_company', 'prosthetics',
  'psychiatrist', 'psychic', 'psychologist', 'psychotherapist',
  'public_housing', 'public_relations_firm', 'public_school', 'publisher',
  'pulmonologist', 'race_track', 'radiator_shop', 'radiologist',
  'raft_trip_outfitter', 'railroad_company', 'real_estate_agency', 'real_estate_appraiser',
  'real_estate_attorney', 'real_estate_developer', 'record_store', 'recreation_center',
  'recreational_vehicle_dealer', 'recruiter', 'recycling_center', 'refrigerator_repair_service',
  'rehabilitation_center', 'remodeler', 'rental_service', 'repair_service',
  'resort', 'restaurant', 'restaurant_supply_store', 'retirement_community',
  'rheumatologist', 'river_rafting_company', 'road_construction_company', 'rock_climbing_gym',
  'roller_skating_rink', 'roofing_contractor', 'rv_park', 'rv_repair_shop',
  'rv_storage_facility', 'saddlery', 'safe_and_vault_shop', 'safety_equipment_supplier',
  'sailboat_dealer', 'sandwich_shop', 'sauna', 'savings_bank',
  'saw_sharpening_service', 'scaffolding_rental_service', 'scale_repair_service', 'scale_supplier',
  'school', 'school_bus_service', 'scooter_rental_service', 'screen_printing_shop',
  'scuba_diving_shop', 'seafood_restaurant', 'seamstress', 'security_guard_service',
  'security_system_supplier', 'self_defense_school', 'self_storage_facility', 'semiconductor_manufacturer',
  'senior_center', 'septic_system_service', 'sewing_machine_store', 'sheet_music_store',
  'shelter', 'shipping_company', 'shipping_service', 'shoe_repair_shop',
  'shoe_store', 'shooting_range', 'shopping_mall', 'sign_shop',
  'silk_plant_shop', 'silversmith', 'skateboard_shop', 'skating_rink',
  'ski_resort', 'ski_shop', 'skin_care_clinic', 'skydiving_center',
  'slaughterhouse', 'small_engine_repair_service', 'smoke_shop', 'snack_bar',
  'snow_removal_service', 'soccer_field', 'social_security_office', 'social_services_organization',
  'software_company', 'solar_energy_company', 'solar_energy_contractor', 'soup_restaurant',
  'souvenir_store', 'spa', 'spanish_restaurant', 'special_education_school',
  'speech_pathologist', 'spice_store', 'sporting_goods_store', 'sports_bar',
  'sports_club', 'sports_medicine_clinic', 'sportswear_store', 'spring_store',
  'stained_glass_studio', 'stationery_store', 'steak_house', 'steel_fabricator',
  'storage_facility', 'storm_damage_restoration_service', 'stove_store', 'structural_engineer',
  'student_housing_center', 'subway_station', 'sunglasses_store', 'sunroom_contractor',
  'supermarket', 'surgeon', 'surgical_center', 'surplus_store',
  'surveyor', 'sushi_restaurant', 'swimming_pool', 'swimming_pool_contractor',
  'synagogue', 'tailor', 'tanning_salon', 'tapas_bar',
  'tattoo_shop', 'tax_preparation_service', 'taxi_service', 'tea_house',
  'teacher', 'telecommunications_service_provider', 'telephone_company', 'television_repair_service',
  'temp_agency', 'tennis_club', 'tent_rental_service', 'texan_restaurant',
  'textile_mill', 'thai_restaurant', 'theater_company', 'therapist',
  'thrift_store', 'ticket_seller', 'tile_contractor', 'tile_store',
  'time_share', 'tire_shop', 'title_company', 'tobacco_shop',
  'tool_rental_service', 'tour_operator', 'tourist_attraction', 'tourist_information_center',
  'towing_service', 'toy_store', 'tractor_dealer', 'trade_school',
  'trailer_dealer', 'trailer_rental_service', 'train_station', 'translator',
  'transmission_shop', 'transportation_service', 'travel_agency', 'tree_service',
  'trophy_shop', 'trucking_company', 'truck_dealer', 'truck_rental_agency',
  'truck_repair_shop', 'tutoring_service', 'tv_station', 'typing_service',
  'uniform_store', 'university', 'upholstery_shop', 'urgent_care_center',
  'urologist', 'used_appliance_store', 'used_auto_parts_store', 'used_book_store',
  'used_car_dealer', 'used_furniture_store', 'used_truck_dealer', 'utility_company',
  'utility_contractor', 'vacation_home_rental_agency', 'vacuum_cleaner_store', 'variety_store',
  'vegan_restaurant', 'vegetarian_restaurant', 'vending_machine_supplier', 'veterinarian',
  'video_game_store', 'video_production_service', 'vietnamese_restaurant', 'vintage_clothing_store',
  'vitamin_and_supplements_store', 'vocational_training_school', 'volleyball_court', 'warehouse',
  'warehouse_store', 'waste_management_service', 'watch_repair_service', 'watch_store',
  'water_damage_restoration_service', 'water_park', 'water_purification_company', 'water_utility_company',
  'web_designer', 'wedding_photographer', 'wedding_planner', 'wedding_venue',
  'weight_loss_service', 'welder', 'wellness_center', 'wheel_alignment_service',
  'wheelchair_store', 'wholesaler', 'wig_shop', 'window_cleaning_service',
  'window_installation_service', 'window_supplier', 'window_tinting_service', 'winery',
  'wine_bar', 'wine_store', 'womens_clothing_store', 'yoga_studio',
  'youth_center', 'zoo',
] as const;

export type XmisoCategory = typeof XMISO_CATEGORIES[number];

/**
 * XMiso GMB Target interface - different from compass scraper
 */
export interface XmisoGMBTarget {
  // Use category OR keyword (keyword takes priority)
  category?: string;
  keyword?: string;
  country: XmisoCountryCode;
  countryName: string;
  state?: XmisoStateCode;  // Only for US
  stateName?: string;
  city?: string;           // Partial match filter
  // Optional geo parameters
  lat?: number;
  lon?: number;
  area?: number;           // km radius, default 10
  // Tracking (set by backend)
  fulfilled_at?: string | null;
  cache_id?: string | null;
  result_count?: number | null;
}

/**
 * Get country name from code
 */
export function getXmisoCountryName(code: XmisoCountryCode): string {
  const country = XMISO_COUNTRIES.find(c => c.code === code);
  return country?.name || code;
}

/**
 * Get state name from code
 */
export function getXmisoStateName(code: XmisoStateCode): string {
  const state = XMISO_US_STATES.find(s => s.code === code);
  return state?.name || code;
}

/**
 * Format category for display (convert snake_case to Title Case)
 */
export function formatCategoryDisplay(category: string): string {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Search categories by keyword
 */
export function searchCategories(query: string, limit: number = 50): string[] {
  if (!query.trim()) {
    return XMISO_POPULAR_CATEGORIES.slice(0, limit);
  }
  
  const searchTerm = query.toLowerCase().replace(/\s+/g, '_');
  
  // Exact match first, then partial match
  const exactMatch = XMISO_CATEGORIES.filter(c => c.includes(searchTerm));
  
  return exactMatch.slice(0, limit);
}

/**
 * Create an XMiso GMB target
 */
export function createXmisoTarget(params: {
  category?: string;
  keyword?: string;
  country: XmisoCountryCode;
  state?: XmisoStateCode;
  city?: string;
  lat?: number;
  lon?: number;
  area?: number;
}): XmisoGMBTarget {
  return {
    category: params.category,
    keyword: params.keyword,
    country: params.country,
    countryName: getXmisoCountryName(params.country),
    state: params.state,
    stateName: params.state ? getXmisoStateName(params.state) : undefined,
    city: params.city?.trim() || undefined,
    lat: params.lat,
    lon: params.lon,
    area: params.area,
  };
}

/**
 * Build xmiso API input from target
 */
export function buildXmisoInput(target: XmisoGMBTarget, maxResults: number = 100): {
  category?: string;
  keyword?: string;
  country: string;
  state?: string;
  city?: string;
  lat?: string;
  lon?: string;
  area?: number;
  max_results: number;
} {
  return {
    // Keyword takes priority over category
    ...(target.keyword ? { keyword: target.keyword } : { category: target.category }),
    country: target.country,
    ...(target.country === 'US' && target.state ? { state: target.state } : {}),
    ...(target.city ? { city: target.city } : {}),
    ...(target.lat ? { lat: target.lat.toString() } : {}),
    ...(target.lon ? { lon: target.lon.toString() } : {}),
    area: target.area || 10,
    max_results: maxResults,
  };
}

/**
 * Generate cache key for xmiso target
 */
export function generateXmisoCacheKey(target: XmisoGMBTarget): string {
  const parts = [
    'xmiso',
    target.keyword || target.category || '',
    target.country,
    target.state || '',
    (target.city || '').toLowerCase().trim(),
  ];
  return parts.join('|');
}

