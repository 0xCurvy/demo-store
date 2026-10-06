import { createBrowserRouter } from "react-router";
import { AdminPage } from "@/pages/AdminPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { CompletionPage } from "@/pages/CompletionPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ShopPage } from "@/pages/ShopPage";
import { Layout } from "./Layout";

/**
 * The shop's pages. /checkout/complete is where Curvy checkout returns the buyer: the server signs
 * it into every payment request (the SDK's default completion path).
 */
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <ShopPage /> },
      { path: "checkout/complete", element: <CompletionPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "admin", element: <AdminPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
