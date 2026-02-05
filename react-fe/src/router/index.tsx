import { createBrowserRouter, Navigate } from "react-router-dom";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Menu from "@/pages/Menu";
import AIChat from "@/pages/AIChat";
import ProtectedRoute from "@/components/ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/menu",
    element: (
      <ProtectedRoute>
        <Menu />
      </ProtectedRoute>
    ),
  },
  {
    path: "/ai-chat",
    element: (
      <ProtectedRoute>
        <AIChat />
      </ProtectedRoute>
    ),
  },
]);

export default router;
