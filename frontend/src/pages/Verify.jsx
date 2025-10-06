import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const Verify = () => {
  const { id, token } = useParams();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let didRun = false; // ✅ avoid double call (React StrictMode)
    const verifyEmail = async () => {
      if (didRun) return;
      didRun = true;

      try {
        const res = await axios.get(
          `http://localhost:5000/api/users/verify/${id}/${token}`
        );
        setStatus("success");
        setMessage(res.data.message);
      } catch (err) {
        setStatus("error");
        setMessage(
          err.response?.data?.message || "Something went wrong"
        );
      }
    };
    verifyEmail();
  }, [id, token]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {status === "verifying" && <p>Verifying...</p>}

      {status === "success" && (
        <>
          <h2 className="text-green-600 text-xl font-bold mb-4">{message}</h2>
          <Link
            to="/login"
            className="text-white bg-gray-500 px-4 py-2 rounded hover:bg-gray-600"
          >
            Go to Login
          </Link>
        </>
      )}

      {status === "error" && (
        <p className="text-red-500 font-medium">{message}</p>
      )}
    </div>
  );
};

export default Verify;
