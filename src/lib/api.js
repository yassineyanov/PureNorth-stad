import axios from "axios";

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("pn_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const SERVICES = [
  { key: "Hemstädning", desc: "Regelbunden eller engångsstädning av ditt hem." },
  { key: "Flyttstädning", desc: "Noggrann städning vid in- och utflyttning." },
  { key: "Kontorsstädning", desc: "Professionell städning av arbetsplatser." },
  { key: "Storstädning", desc: "Djuprengöring av hela bostaden." },
];
