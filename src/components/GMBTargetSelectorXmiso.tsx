"use client";

import { useState, useMemo, useCallback } from "react";
import { 
  MapPin, 
  Plus, 
  X, 
  ChevronDown,
  Building,
  Search,
  Tag,
} from "lucide-react";
import { 
  XMISO_COUNTRIES,
  XMISO_US_STATES,
  XMISO_POPULAR_CATEGORIES,
  searchCategories,
  formatCategoryDisplay,
  createXmisoTarget,
  getXmisoCountryName,
  type XmisoGMBTarget,
  type XmisoCountryCode,
  type XmisoStateCode,
} from "@/lib/data/xmiso-categories";

interface GMBTargetSelectorXmisoProps {
  targets: XmisoGMBTarget[];
  onChange: (targets: XmisoGMBTarget[]) => void;
  maxTargets?: number;
  disabled?: boolean;
}

export function GMBTargetSelectorXmiso({
  targets,
  onChange,
  maxTargets = 5,
  disabled = false,
}: GMBTargetSelectorXmisoProps) {
  // Form state
  const [useKeyword, setUseKeyword] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [country, setCountry] = useState<XmisoCountryCode>("US");
  const [state, setState] = useState<XmisoStateCode>("All");
  const [city, setCity] = useState("");

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    return searchCategories(categorySearch, 50);
  }, [categorySearch]);

  // Handle country change
  const handleCountryChange = useCallback((newCountry: XmisoCountryCode) => {
    setCountry(newCountry);
    if (newCountry !== "US") {
      setState("All");
    }
  }, []);

  // Handle category selection
  const handleCategorySelect = useCallback((cat: string) => {
    setCategory(cat);
    setCategorySearch(formatCategoryDisplay(cat));
    setShowCategoryDropdown(false);
  }, []);

  // Add new target
  const handleAddTarget = useCallback(() => {
    const searchTerm = useKeyword ? keyword.trim() : category;
    if (!searchTerm) return;
    if (targets.length >= maxTargets) return;

    const newTarget = createXmisoTarget({
      ...(useKeyword ? { keyword: keyword.trim() } : { category }),
      country,
      state: country === "US" && state !== "All" ? state : undefined,
      city: city.trim() || undefined,
    });

    // Check for duplicates
    const isDuplicate = targets.some(t => 
      (t.keyword === newTarget.keyword && t.category === newTarget.category) &&
      t.country === newTarget.country &&
      t.state === newTarget.state &&
      t.city?.toLowerCase() === newTarget.city?.toLowerCase()
    );

    if (isDuplicate) return;

    onChange([...targets, newTarget]);

    // Reset form
    setKeyword("");
    setCategory("");
    setCategorySearch("");
    setCity("");
  }, [useKeyword, keyword, category, country, state, city, targets, maxTargets, onChange]);

  // Remove target
  const handleRemoveTarget = useCallback((index: number) => {
    const newTargets = targets.filter((_, i) => i !== index);
    onChange(newTargets);
  }, [targets, onChange]);

  // Format target for display
  const formatTargetDisplay = (target: XmisoGMBTarget) => {
    const industry = target.keyword || (target.category ? formatCategoryDisplay(target.category) : "Unknown");
    let location = "";
    
    if (target.city) {
      location = `${target.city}, ${target.stateName || target.state || ''}, ${target.countryName}`.replace(/, ,/g, ',');
    } else if (target.state && target.state !== "All") {
      location = `Anywhere in ${target.stateName || target.state}, ${target.countryName}`;
    } else {
      location = `Anywhere in ${target.countryName}`;
    }
    
    return { industry, location };
  };

  const isAtLimit = targets.length >= maxTargets;
  const canAdd = (useKeyword ? keyword.trim() : category) && !isAtLimit;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Business Lead Finder
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
            XMiso
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

        {/* Toggle: Category vs Keyword */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUseKeyword(false)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !useKeyword
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-slate-700/50 text-gray-400 border border-slate-600 hover:bg-slate-700"
            }`}
          >
            <Tag className="w-4 h-4 inline mr-2" />
            Category
          </button>
          <button
            type="button"
            onClick={() => setUseKeyword(true)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              useKeyword
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-slate-700/50 text-gray-400 border border-slate-600 hover:bg-slate-700"
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Keyword Search
          </button>
        </div>

        {/* Category or Keyword Input */}
        {useKeyword ? (
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Keyword (searches all categories)</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., teeth whitening, hvac repair, wedding photography..."
              disabled={disabled || isAtLimit}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Category</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => {
                  setCategorySearch(e.target.value);
                  setCategory("");
                  setShowCategoryDropdown(true);
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 200)}
                placeholder="Search categories (e.g., plumber, dentist, hvac)..."
                disabled={disabled || isAtLimit}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
              
              {/* Category Dropdown */}
              {showCategoryDropdown && (
                <div className="absolute z-50 w-full mt-1 max-h-60 overflow-auto rounded-xl bg-slate-800 border border-slate-700 shadow-xl">
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleCategorySelect(cat)}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-slate-700/50 transition-colors"
                      >
                        {formatCategoryDisplay(cat)}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      No categories found. Try a keyword search instead.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-sm text-gray-400">in location...</p>

        {/* Location Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Country Dropdown */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">Country</label>
            <div className="relative">
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value as XmisoCountryCode)}
                disabled={disabled || isAtLimit}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {XMISO_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* State Dropdown (US only) */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">
              {country === "US" ? "State" : "State/Region"}
            </label>
            <div className="relative">
              <select
                value={state}
                onChange={(e) => setState(e.target.value as XmisoStateCode)}
                disabled={disabled || isAtLimit || country !== "US"}
                className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {XMISO_US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {country !== "US" && (
              <p className="text-xs text-gray-500">State filter only available for US</p>
            )}
          </div>

          {/* City Input (partial match) */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500">City (optional)</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Los Angeles, New York..."
              disabled={disabled || isAtLimit}
              className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500">Partial match (e.g., &quot;Wash&quot; matches Washington)</p>
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
                    {target.keyword && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                        keyword
                      </span>
                    )}
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
          : "Each target will be scraped once (cached for 6 months). Shared cache means instant results if someone already searched the same target."
        }
      </p>
    </div>
  );
}

