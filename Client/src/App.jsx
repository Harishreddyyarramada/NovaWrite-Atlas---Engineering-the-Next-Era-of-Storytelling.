import "./App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Login from "./Components/Login/Login.jsx";
import Home from "./Components/Home/Home.jsx";
import Posts from "./Components/Posts/Posts.jsx";
import SavedPosts from "./Components/SavedPosts/SavedPosts.jsx";
import Chat from "./Components/Chat/Chat.jsx";
import Feeds from './Components/Feeds/Feeds.jsx'
import Protectedroute from "./Components/Protected/Protectedroute.jsx";
import Pagenotfound from './Components/PagenotFound/PagenotFound.jsx'
import SinglePost from "./Components/SinglePost/SinglePost.jsx";
import Profile from "./Components/Profile/Profile.jsx";
import ProfileAnalytics from "./Components/Profile/ProfileAnalytics.jsx";
import AdminLogin from "./Components/Admin/AdminLogin.jsx";
import AdminDashboard from "./Components/Admin/AdminDashboard.jsx";
import AdminProtected from "./Components/Admin/AdminProtected.jsx";
import FooterPage from "./Components/Footer/FooterPage.jsx";
import ScrollToTop from "./Components/Common/ScrollToTop.jsx";
import { useEffect } from "react";
import { BrowserRouter , Routes , Route } from "react-router-dom";
function App() {
  useEffect(() => {
    const theme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <>
      <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route index element={<Login/>} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route element={<AdminProtected />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
            <Route element={<Protectedroute/>}>
                <Route path="/home" element={<Home/>} >
                    <Route path="posts" element={<Posts/>} />
                    <Route path="saved" element={<SavedPosts/>} />
                    <Route path=":slug" element={<FooterPage/>} />
                </Route>
                <Route path="/chat" element={<Chat/>} />
                <Route path="/posts/:id" element={<SinglePost/>} />
                <Route path="/posts/feeds/:id" element={<Feeds />} />
                <Route path="/myprofile" element={<Profile/>} />
                <Route path="/myprofile/analytics" element={<ProfileAnalytics/>} />
            </Route>
            <Route path="*" element={<Pagenotfound/>}/>
          </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
