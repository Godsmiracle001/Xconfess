import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // your backend base URL
  withCredentials: true, // send cookies if needed
});

export default apiClient;