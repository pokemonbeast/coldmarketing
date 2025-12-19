"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import {
  GitBranch,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  ChevronDown,
  Link2,
  Unlink,
} from "lucide-react";
import type { Service, ApiProvider, ServiceMapping } from "@/types/database";

interface ServiceWithMappings extends Service {
  mappings: (ServiceMapping & { provider?: ApiProvider })[];
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServiceWithMappings[]>([]);
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceWithMappings | null>(null);
  const [saving, setSaving] = useState(false);

  // Service form state
  const [serviceForm, setServiceForm] = useState({
    name: "",
    slug: "",
    description: "",
    is_active: true,
  });

  // Mapping form state
  const [mappingForm, setMappingForm] = useState({
    provider_id: "",
    external_service_id: "",
    priority: 1,
    is_active: true,
  });

  const fetchData = async () => {
    setLoading(true);
    const supabase = createClient();

    // Fetch services
    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .order("name", { ascending: true });

    // Fetch providers
    const { data: providersData } = await supabase
      .from("api_providers")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    // Fetch all mappings with provider info
    const { data: mappingsData } = await supabase
      .from("service_mappings")
      .select("*, provider:api_providers(*)");

    if (servicesData && mappingsData) {
      const servicesWithMappings = servicesData.map((service) => ({
        ...service,
        mappings: mappingsData.filter((m) => m.service_id === service.id),
      }));
      setServices(servicesWithMappings as unknown as ServiceWithMappings[]);
    }

    if (providersData) {
      setProviders(providersData as unknown as ApiProvider[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openServiceModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        slug: service.slug,
        description: service.description || "",
        is_active: service.is_active ?? true,
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: "",
        slug: "",
        description: "",
        is_active: true,
      });
    }
    setShowServiceModal(true);
  };

  const openMappingModal = (service: ServiceWithMappings) => {
    setSelectedService(service);
    setMappingForm({
      provider_id: "",
      external_service_id: "",
      priority: 1,
      is_active: true,
    });
    setShowMappingModal(true);
  };

  const handleSaveService = async () => {
    setSaving(true);
    const supabase = createClient();

    const serviceData = {
      name: serviceForm.name,
      slug: serviceForm.slug.toLowerCase().replace(/\s+/g, "-"),
      description: serviceForm.description,
      is_active: serviceForm.is_active,
    };

    if (editingService) {
      await supabase
        .from("services")
        .update(serviceData)
        .eq("id", editingService.id);
    } else {
      await supabase.from("services").insert(serviceData);
    }

    setSaving(false);
    setShowServiceModal(false);
    fetchData();
  };

  const handleSaveMapping = async () => {
    if (!selectedService) return;

    setSaving(true);
    const supabase = createClient();

    await supabase.from("service_mappings").insert({
      service_id: selectedService.id,
      provider_id: mappingForm.provider_id,
      external_service_id: mappingForm.external_service_id,
      priority: mappingForm.priority,
      is_active: mappingForm.is_active,
    });

    setSaving(false);
    setShowMappingModal(false);
    fetchData();
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;

    const supabase = createClient();
    await supabase.from("services").delete().eq("id", serviceId);
    fetchData();
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm("Remove this provider mapping?")) return;

    const supabase = createClient();
    await supabase.from("service_mappings").delete().eq("id", mappingId);
    fetchData();
  };

  const toggleMappingActive = async (mapping: ServiceMapping) => {
    const supabase = createClient();
    await supabase
      .from("service_mappings")
      .update({ is_active: !mapping.is_active })
      .eq("id", mapping.id);
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-orange-400" />
            </div>
            Service Mapping
          </h1>
          <p className="text-gray-400 mt-1">
            Configure which API provider handles each service
          </p>
        </div>
        <button
          onClick={() => openServiceModal()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {/* Services list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : services.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <GitBranch className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">No services configured yet</p>
          <button
            onClick={() => openServiceModal()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-primary text-white font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Your First Service
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-card p-6 ${
                !service.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                {/* Service info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white">
                      {service.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        service.is_active
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {service.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {service.description && (
                    <p className="text-gray-400 text-sm mb-4">
                      {service.description}
                    </p>
                  )}

                  {/* Mappings */}
                  <div className="space-y-2">
                    <p className="text-gray-500 text-sm font-medium">
                      Provider Mappings:
                    </p>
                    {service.mappings.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">
                        No providers mapped
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {service.mappings.map((mapping) => (
                          <div
                            key={mapping.id}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                              mapping.is_active
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                            }`}
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>{mapping.provider?.name}</span>
                            {mapping.external_service_id && (
                              <span className="text-gray-500">
                                (ID: {mapping.external_service_id})
                              </span>
                            )}
                            <button
                              onClick={() => toggleMappingActive(mapping)}
                              className="ml-1 p-0.5 hover:bg-white/10 rounded"
                              title={mapping.is_active ? "Deactivate" : "Activate"}
                            >
                              {mapping.is_active ? (
                                <Unlink className="w-3.5 h-3.5" />
                              ) : (
                                <Link2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteMapping(mapping.id)}
                              className="p-0.5 hover:bg-white/10 rounded text-red-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2">
                  <button
                    onClick={() => openMappingModal(service)}
                    disabled={providers.length === 0}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Map Provider
                  </button>
                  <button
                    onClick={() => openServiceModal(service)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingService ? "Edit Service" : "Add Service"}
              </h2>
              <button
                onClick={() => setShowServiceModal(false)}
                className="p-2 rounded-lg bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Service Name
                </label>
                <input
                  type="text"
                  value={serviceForm.name}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, name: e.target.value })
                  }
                  placeholder="e.g. LinkedIn Commenter"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Slug
                </label>
                <input
                  type="text"
                  value={serviceForm.slug}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, slug: e.target.value })
                  }
                  placeholder="e.g. linkedin-commenter"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description of the service"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={serviceForm.is_active}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      is_active: e.target.checked,
                    })
                  }
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-gray-300">Service is active</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowServiceModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveService}
                disabled={!serviceForm.name || saving}
                className="flex-1 px-4 py-3 rounded-xl btn-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Save Service"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Mapping Modal */}
      {showMappingModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 w-full max-w-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                Map Provider to {selectedService.name}
              </h2>
              <button
                onClick={() => setShowMappingModal(false)}
                className="p-2 rounded-lg bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Select Provider
                </label>
                <div className="relative">
                  <select
                    value={mappingForm.provider_id}
                    onChange={(e) =>
                      setMappingForm({
                        ...mappingForm,
                        provider_id: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all appearance-none"
                  >
                    <option value="">Select a provider...</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  External Service ID (from provider)
                </label>
                <input
                  type="text"
                  value={mappingForm.external_service_id}
                  onChange={(e) =>
                    setMappingForm({
                      ...mappingForm,
                      external_service_id: e.target.value,
                    })
                  }
                  placeholder="e.g. 123"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <p className="text-gray-500 text-xs">
                  The service ID from the provider&apos;s API (found in their
                  services list)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Priority
                </label>
                <input
                  type="number"
                  value={mappingForm.priority}
                  onChange={(e) =>
                    setMappingForm({
                      ...mappingForm,
                      priority: parseInt(e.target.value) || 1,
                    })
                  }
                  min="1"
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <p className="text-gray-500 text-xs">
                  Lower number = higher priority (used when multiple providers
                  are mapped)
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mappingForm.is_active}
                  onChange={(e) =>
                    setMappingForm({
                      ...mappingForm,
                      is_active: e.target.checked,
                    })
                  }
                  className="w-5 h-5 rounded bg-slate-900 border-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                />
                <span className="text-gray-300">Mapping is active</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMappingModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-gray-300 hover:text-white hover:bg-slate-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMapping}
                disabled={!mappingForm.provider_id || saving}
                className="flex-1 px-4 py-3 rounded-xl btn-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Add Mapping"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

