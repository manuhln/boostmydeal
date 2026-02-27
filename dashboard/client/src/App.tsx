import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Dashboard from "@/pages/Dashboard";
import CallLogs from "@/pages/CallLogs";
import AgentManagement from "@/pages/AgentManagement";
import ProviderSettings from "@/pages/ProviderSettings";
import Settings from "@/pages/Settings";
import UserProfile from "@/pages/UserProfile";
import Integrations from "@/pages/Integrations";
import PhoneNumbers from "@/pages/PhoneNumbers";
import Workflows from "@/pages/Workflows";
import CreateWorkflow from "@/pages/CreateWorkflow";
import WorkflowExecutionHistory from "@/pages/WorkflowExecutionHistory";
import KnowledgeBase from "@/pages/KnowledgeBase";
import WebhookDebug from "@/pages/WebhookDebug";
import Notifications from "@/pages/Notifications";


import AcceptInvite from "@/pages/AcceptInvite";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/not-found";
import Onboarding from "./pages/Onboarding";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Always check for token first
  const hasToken = !!localStorage.getItem('authToken');

  // Removed continuous logging to prevent console spam

  if (isLoading && hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasToken || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/wizard" component={Onboarding} />
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/accept-invite/:token" component={AcceptInvite} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/call-logs" component={CallLogs} />
      <Route path="/agents" component={AgentManagement} />
      <Route path="/phone-numbers" component={PhoneNumbers} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/workflows" component={Workflows} />
      <Route path="/workflows/create" component={CreateWorkflow} />
      <Route path="/workflows/edit/:id" component={CreateWorkflow} />
      <Route path="/workflows/execution-history/:workflowId" component={WorkflowExecutionHistory} />
      <Route path="/knowledge-base" component={KnowledgeBase} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/webhook-debug" component={WebhookDebug} />

      <Route path="/settings" component={Settings} />
      <Route path="/provider-settings" component={ProviderSettings} />
      <Route path="/profile" component={UserProfile} />
      {/* Allow reset password even when logged in - uses its own token validation */}
      <Route path="/reset-password" component={ResetPassword} />
      {/* Redirect other auth routes to dashboard when logged in */}
      <Route path="/login" component={Dashboard} />
      <Route path="/signup" component={Dashboard} />
      <Route path="/forgot-password" component={Dashboard} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
