"use client";

import { useState, useMemo, useCallback } from "react";
import { 
  MapPin, 
  Plus, 
  X, 
  ChevronDown,
  Building,
  Search,
} from "lucide-react";
import { 
  SUPPORTED_COUNTRIES, 
  getStates, 
  getCities,
  createGMBTarget,
  isDuplicateTarget,
  type GMBTarget,
  type SupportedCountryCode,
} from "@/lib/data/locations";

interface GMBTargetSelectorProps {
  targets: GMBTarget[];
  onChange: (targets: GMBTarget[]) => void;
  maxTargets?: number;
  disabled?: boolean;
}

export function GMBTargetSelector({
  targets,
  onChange,
  maxTargets = 5,
  disabled = false,
}: GMBTargetSelectorProps) {
  // Form state for adding new targets
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState<SupportedCountryCode>("US");
  const [stateCode, setStateCode] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [citySearch, setCitySearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Get states for selected country
  const states = useMemo(() => {
    return getStates(country);
  }, [country]);

  // Get cities for selected state
  const cities = useMemo(() => {
    if (!stateCode) return [];
    return getCities(country, stateCode);
  }, [country, stateCode]);

  // Filtered cities based on search
  const filteredCities = useMemo(() => {
    if (!citySearch) return cities.slice(0, 100); // Limit initial display
    const search = citySearch.toLowerCase();
    return cities
      .filter(c => c.name.toLowerCase().includes(search))
      .slice(0, 100);
  }, [cities, citySearch]);

  // Handle country change
  const handleCountryChange = useCallback((newCountry: SupportedCountryCode) => {
    setCountry(newCountry);
    setStateCode("");
    setCity("");
    setCitySearch("");
  }, []);

  // Handle state change
  const handleStateChange = useCallback((newStateCode: string) => {
    setStateCode(newStateCode);
    setCity("");
    setCitySearch("");
  }, []);

  // Handle city selection
  const handleCitySelect = useCallback((cityName: string) => {
    setCity(cityName);
    setCitySearch(cityName);
    setShowCityDropdown(false);
  }, []);

  // Add new target
  const handleAddTarget = useCallback(() => {
    if (!industry.trim()) return;
    if (targets.length >= maxTargets) return;

    const newTarget = createGMBTarget({
      industry: industry.trim(),
      country,
      stateCode: stateCode || null,
      city: city || null,
    });

    // Check for duplicates
    if (isDuplicateTarget(targets, newTarget)) {
      return; // Silently ignore duplicates
    }

    onChange([...targets, newTarget]);

    // Reset form
    setIndustry("");
    setCity("");
    setCitySearch("");
  }, [industry, country, stateCode, city, targets, maxTargets, onChange]);

  // Remove target
  const handleRemoveTarget = useCallback((index: number) => {
    const newTargets = targets.filter((_, i) => i !== index);
    onChange(newTargets);
  }, [targets, onChange]);

  // Format target for display
  const formatTargetDisplay = (target: GMBTarget) => {
    let location = "";
    if (!target.state && !target.city) {
      location = `Anywhere in ${target.countryName}`;
    } else if (!target.city) {
      location = `Anywhere in ${target.state}, ${target.country}`;
    } else {
      location = `${target.city}, ${target.stateCode}, ${target.country}`;
    }
    return { industry: target.industry, location };
  };

  const isAtLimit = targets.length >= maxTargets;
  const canAdd = industry.trim() && !isAtLimit;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Business Lead Finder
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-gray-400">
            Optional
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isAtLimit
              ? "bg-amber-500/20 text-amber-400"
              : "bg-slate-700 text-gray-400"
          }`}>
            {targets.length}/{maxTargets}
          </span>
        </label>
      </div>

      {/* Input Form */}
      <div className="p-4 bg-slate-800/50 rounded-xl space-y-4">
        <p className="text-sm text-gray-400 flex items-center gap-2">
          <Building className="w-4 h-4" />
          I am targeting...
        </p>

        {/* Industry Input */}
        <div className="space-y-2">
          <label className="text-xs text-gray-500">Industry</label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Plumbers, Dentists, HVAC..."
            disabled={disabled || isAtLimit}
            className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <p className="text-sm text-gray-400">in location...</p>

        {/* Location Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Country Dropdown */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Country</label>
            <div className="relative">
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value as SupportedCountryCode)}
                disabled={disabled || isAtLimit}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {SUPPORTED_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* State Dropdown */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">State/Province</label>
            <div className="relative">
              <select
                value={stateCode}
                onChange={(e) => handleStateChange(e.target.value)}
                disabled={disabled || isAtLimit}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {country === "US" ? "Anywhere in USA" : 
                   country === "CA" ? "Anywhere in Canada" :
                   country === "GB" ? "Anywhere in UK" :
                   country === "DE" ? "Anywhere in Germany" :
                   country === "AU" ? "Anywhere in Australia" :
                   `Anywhere in ${SUPPORTED_COUNTRIES.find(c => c.code === country)?.name || country}`}
                </option>
                {states.map((s) => (
                  <option key={s.isoCode} value={s.isoCode}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* City Dropdown with Search */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">City</label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value);
                    setCity("");
                    setShowCityDropdown(true);
                  }}
                  onFocus={() => setShowCityDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                  placeholder={stateCode ? "Search city..." : "Select state first"}
                  disabled={disabled || isAtLimit || !stateCode}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              
              {/* City Dropdown */}
              {showCityDropdown && stateCode && (
                <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-xl bg-slate-800 border border-slate-700 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setCity("");
                      setCitySearch("");
                      setShowCityDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-slate-700/50 transition-colors"
                  >
                    Anywhere in {states.find(s => s.isoCode === stateCode)?.name}
                  </button>
                  {filteredCities.length > 0 ? (
                    filteredCities.map((c) => (
                      <button
                        key={`${c.name}-${c.latitude}`}
                        type="button"
                        onClick={() => handleCitySelect(c.name)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-slate-700/50 transition-colors"
                      >
                        {c.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      {citySearch ? "No cities found" : "Type to search..."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Button */}
        <button
          type="button"
          onClick={handleAddTarget}
          disabled={disabled || !canAdd}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Target
        </button>
      </div>

      {/* Added Targets */}
      {targets.length > 0 && (
        <div className="space-y-2">
          {targets.map((target, index) => {
            const display = formatTargetDisplay(target);
            return (
              <div
                key={index}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-emerald-400 font-medium">
                      {display.industry}
                    </span>
                    <span className="text-gray-400 mx-2">in</span>
                    <span className="text-gray-300">
                      {display.location}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveTarget(index)}
                  disabled={disabled}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500">
        {targets.length === 0 
          ? "Optional: Add up to " + maxTargets + " target industries and locations. We'll find verified business leads with emails for each target."
          : "Add up to " + maxTargets + " targets. Each target will be scraped once to find verified business leads with emails."
        }
      </p>
    </div>
  );
}

