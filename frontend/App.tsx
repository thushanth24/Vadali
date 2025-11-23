import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { UserRole } from './types';

const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));

const HomePage = lazy(() => import('./pages/HomePage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ArticlePage = lazy(() => import('./pages/ArticlePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminDashboard = lazy(() => import('./pages/dashboard/AdminDashboard'));
const EditorDashboard = lazy(() => import('./pages/dashboard/EditorDashboard'));
const AuthorDashboard = lazy(() => import('./pages/dashboard/AuthorDashboard'));
const CreateArticle = lazy(() => import('./pages/dashboard/author/CreateArticle'));
const EditArticle = lazy(() => import('./pages/dashboard/author/EditArticle'));
const PreviewArticle = lazy(() => import('./pages/dashboard/author/PreviewArticle'));
const AuthorNotifications = lazy(() => import('./pages/dashboard/author/AuthorNotifications'));
const AuthorProfileSettings = lazy(() => import('./pages/dashboard/author/AuthorProfileSettings'));
const UserManagement = lazy(() => import('./pages/dashboard/admin/UserManagement'));
const CategoryManagement = lazy(() => import('./pages/dashboard/admin/CategoryManagement'));
const AllArticles = lazy(() => import('./pages/dashboard/admin/AllArticles'));
const AdminEditArticle = lazy(() => import('./pages/dashboard/admin/EditArticle'));
const AboutUsPage = lazy(() => import('./pages/AboutUsPage'));
const ContactUsPage = lazy(() => import('./pages/ContactUsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const AuthorPage = lazy(() => import('./pages/AuthorPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const TrendingPage = lazy(() => import('./pages/TrendingPage'));
const AdvertisePage = lazy(() => import('./pages/AdvertisePage'));
const AdvertisementPage = lazy(() => import('./pages/AdvertisementPage'));
const AdvertisementsPage = lazy(() => import('./pages/AdvertisementsPage'));
const EditorialPolicyPage = lazy(() => import('./pages/EditorialPolicyPage'));
const SubscribePage = lazy(() => import('./pages/SubscribePage'));
const ReviewArticle = lazy(() => import('./pages/dashboard/editor/ReviewArticle'));
const ScheduleArticle = lazy(() => import('./pages/dashboard/editor/ScheduleArticle'));
const FeaturedManager = lazy(() => import('./pages/dashboard/editor/FeaturedManager'));
const CommentModeration = lazy(() => import('./pages/dashboard/editor/CommentModeration'));
const ArticleManagement = lazy(() => import('./pages/dashboard/editor/ArticleManagement'));
const AdManagement = lazy(() => import('./pages/dashboard/admin/AdManagement'));
const NewsletterManagement = lazy(() => import('./pages/dashboard/admin/NewsletterManagement'));
const ReportsAnalytics = lazy(() => import('./pages/dashboard/admin/ReportsAnalytics'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));

const PageLoader: React.FC = () => (
  <LoadingSpinner label="Loading page..." fullScreen className="bg-gray-50" />
);

const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes with Layout */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="article/:slug" element={<ArticlePage />} />
            <Route path="category/:slug" element={<CategoryPage />} />
            <Route path="author/:slug" element={<AuthorPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="trending" element={<TrendingPage />} />
            <Route path="subscribe" element={<SubscribePage />} />
            <Route path="ads" element={<AdvertisementsPage />} />
            <Route path="ads/:slug" element={<AdvertisementPage />} />
            <Route path="about" element={<AboutUsPage />} />
            <Route path="contact" element={<ContactUsPage />} />
            <Route path="privacy" element={<PrivacyPolicyPage />} />
            <Route path="terms" element={<TermsOfServicePage />} />
            <Route path="advertise" element={<AdvertisePage />} />
            <Route path="editorial-policy" element={<EditorialPolicyPage />} />
            <Route path="login" element={<LoginPage />} />
          </Route>

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
              <Route path="articles/edit/:id" element={<AdminEditArticle />} />
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
              <Route path="articles" element={<ArticleManagement />} />
              <Route path="create" element={<CreateArticle />} />
              <Route path="edit/:id" element={<AdminEditArticle />} />
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
      </Suspense>
    </Router>
  );
};

export default App;
