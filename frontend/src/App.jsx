import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
console.log(user);
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await axios.get("/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(res.data);
        } catch (err) {
          console.error("Failed to fetch user data:", err);
          setError("Failed to fetch user data");
          localStorage.removeItem("token");
        }
      }
    };
    fetchUser();
  }, []);

  return (
    <BrowserRouter>
      <Navbar user={user} setUser={setUser} />
      {error && (
        <p className="text-center text-red-500 mt-4 text-sm">{error}</p>
      )}
      <Routes>
        <Route path="/" element={<Home user={user} error={error} />} />
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<Register  setUser={setUser} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
