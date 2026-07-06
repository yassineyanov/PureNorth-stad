import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useWebsite } from "@/context/WebsiteContext";

const initialForm = {
  name: "", email: "", phone: "", address: "", kvm: "", preferred_date: "", other_description: "",
};

const KVM_SERVICES = ["Hemstädning", "Flyttstädning", "Storstädning", "Byggstädning"];

export function useBookingForm() {
  const ws = useWebsite();
  const [form, setForm] = useState(initialForm);
  const [services, setServices] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [serviceOptions, setServiceOptions] = useState(["Hemstädning", "Flyttstädning", "Kontorsstädning", "Storstädning", "Annat"]);
  const [priceItems, setPriceItems] = useState([]);

  const needsKvm = services.some(s => KVM_SERVICES.includes(s));

  const quantityInfo = (() => {
    if (services.length === 0) return null;
    if (priceItems.length > 0) {
      const units = services.map(s => { const item = priceItems.find(p => p.service === s); return item ? item.unit : null; }).filter(Boolean);
      if (units.includes("st")) return { label: "Antal (st)", placeholder: "T.ex. 5" };
      if (units.includes("kvm") || units.includes("tim")) return { label: "Yta (kvm)", placeholder: "T.ex. 75" };
      return null;
    }
    if (needsKvm) return { label: "Yta (kvm)", placeholder: "T.ex. 75" };
    return null;
  })();

  useEffect(() => {
    api.get("/settings/pricelist").then((res) => {
      const items = res.data.items?.filter((p) => p.is_active && !p.service.includes("(fast)")) || [];
      const active = items.map((p) => p.service);
      setPriceItems(items);
      if (active.length > 0) setServiceOptions([...active, "Annat"].filter((s, i, arr) => arr.indexOf(s) === i));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (ws.booking_services?.length > 0) setServiceOptions(ws.booking_services);
  }, [ws.booking_services]);

  const annatSelected = services.includes("Annat") || services.some((s) => !serviceOptions.slice(0, -1).includes(s));

  const toggleService = (s, closeDropdown = true) => {
    setServices((prev) => prev.includes(s) ? [] : [s]);
    if (closeDropdown) setServiceDropdownOpen(false);
  };

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) { toast.error("Fyll i namn, e-post och telefonnummer."); return; }
    if (services.length === 0) { toast.error("Välj minst en tjänst."); return; }
    setSubmitting(true);
    try {
      await api.post("/bookings", { ...form, services });
      setDone(true);
      toast.success("Tack! Din bokningsförfrågan har skickats.");
      setForm(initialForm);
      setServices([]);
    } catch { toast.error("Något gick fel. Försök igen eller ring oss."); }
    finally { setSubmitting(false); }
  };

  return {
    form, services, submitting, done, setDone,
    serviceDropdownOpen, setServiceDropdownOpen,
    serviceOptions, quantityInfo, annatSelected,
    toggleService, update, submit,
  };
}
