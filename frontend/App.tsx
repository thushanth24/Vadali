import React from 'react';
import { HashRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ArticlePage from './pages/ArticlePage';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import EditorDashboard from './pages/dashboard/EditorDashboard';
import AuthorDashboard from './pages/dashboard/AuthorDashboard';
import CreateArticle from './pages/dashboard/author/CreateArticle';
import EditArticle from './pages/dashboard/author/EditArticle';
import PreviewArticle from './pages/dashboard/author/PreviewArticle';
import AuthorNotifications from './pages/dashboard/author/AuthorNotifications';
import AuthorProfileSettings from './pages/dashboard/author/AuthorProfileSettings';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { UserRole } from './types';
import UserManagement from './pages/dashboard/admin/UserManagement';
import CategoryManagement from './pages/dashboard/admin/CategoryManagement';
import AllArticles from './pages/dashboard/admin/AllArticles';
import AboutUsPage from './pages/AboutUsPage';
import ContactUsPage from './pages/ContactUsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import TagPage from './pages/TagPage';
import AuthorPage from './pages/AuthorPage';
import SearchPage from './pages/SearchPage';
import TrendingPage from './pages/TrendingPage';
import AdvertisePage from './pages/AdvertisePage';
import EditorialPolicyPage from './pages/EditorialPolicyPage';
import SubscribePage from './pages/SubscribePage';
import ReviewArticle from './pages/dashboard/editor/ReviewArticle';
import ScheduleArticle from './pages/dashboard/editor/ScheduleArticle';
import FeaturedManager from './pages/dashboard/editor/FeaturedManager';
import CommentModeration from './pages/dashboard/editor/CommentModeration';
import AdManagement from './pages/dashboard/admin/AdManagement';
import NewsletterManagement from './pages/dashboard/admin/NewsletterManagement';
import ReportsAnalytics from './pages/dashboard/admin/ReportsAnalytics';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MaintenancePage from './pages/MaintenancePage';
import RegisterPage from './pages/RegisterPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes with Layout */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="article/:slug" element={<ArticlePage />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="tag/:slug" element={<TagPage />} />
          <Route path="author/:slug" element={<AuthorPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="trending" element={<TrendingPage />} />
          <Route path="subscribe" element={<SubscribePage />} />
          <Route path="about" element={<AboutUsPage />} />
          <Route path="contact" element={<ContactUsPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />
          <Route path="terms" element={<TermsOfServicePage />} />
          <Route path="advertise" element={<AdvertisePage />} />
          <Route path="editorial-policy" element={<EditorialPolicyPage />} />
        </Route>

        {/* Standalone Auth & System Pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />

        {/* Protected Dashboard Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.EDITOR, UserRole.AUTHOR]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Admin Routes */}
          <Route path="admin" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <Outlet />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="articles" element={<AllArticles />} />
            <Route path="ads" element={<AdManagement />} />
            <Route path="newsletter" element={<NewsletterManagement />} />
            <Route path="reports" element={<ReportsAnalytics />} />
            <Route path="comments" element={<CommentModeration />} />
          </Route>

          {/* Editor Routes */}
          <Route path="editor" element={
            <ProtectedRoute allowedRoles={[UserRole.EDITOR, UserRole.ADMIN]}>
              <Outlet />
            </ProtectedRoute>
          }>
            <Route index element={<EditorDashboard />} />
            <Route path="review/:id" element={<ReviewArticle />} />
            <Route path="schedule/:id" element={<ScheduleArticle />} />
            <Route path="featured" element={<FeaturedManager />} />
            <Route path="comments" element={<CommentModeration />} />
          </Route>
          
          {/* Author Routes */}
          <Route path="author" element={
            <ProtectedRoute allowedRoles={[UserRole.AUTHOR]}>
                <Outlet />
            </ProtectedRoute>
          }>
             <Route index element={<AuthorDashboard />} />
             <Route path="create" element={<CreateArticle />} />
             <Route path="edit/:id" element={<EditArticle />} />
             <Route path="preview/:id" element={<PreviewArticle />} />
             <Route path="notifications" element={<AuthorNotifications />} />
             <Route path="profile" element={<AuthorProfileSettings />} />
          </Route>
        </Route>
        
        {/* Not Found Route - Redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;