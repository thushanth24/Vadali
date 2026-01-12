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
const PendingArticles = lazy(() => import('./pages/dashboard/editor/PendingArticles'));
const AdManagement = lazy(() => import('./pages/dashboard/admin/AdManagement'));
const NewsletterManagement = lazy(() => import('./pages/dashboard/admin/NewsletterManagement'));
const ReportsAnalytics = lazy(() => import('./pages/dashboard/admin/ReportsAnalytics'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));

const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-gray-50 text-gray-900">
    <div className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="flex items-center space-x-3">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-14 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>

    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="h-72 bg-gray-200 rounded-2xl animate-pulse" />
          <div className="mt-4 space-y-3">
            <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(key => (
            <div key={key} className="flex space-x-3">
              <div className="h-16 w-20 bg-gray-200 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse"
          >
            <div className="aspect-video bg-gray-200" />
            <div className="p-4 space-y-3">
              <div className="h-4 w-5/6 bg-gray-200 rounded" />
              <div className="h-3 w-2/3 bg-gray-200 rounded" />
              <div className="h-3 w-1/2 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
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
              <Route path="pending" element={<PendingArticles />} />
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
