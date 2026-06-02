import React, { useEffect, useMemo, useState } from 'react';
import {
  HashRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import SpaRoundedIcon from '@mui/icons-material/SpaRounded';
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded';
import { motion } from 'framer-motion';
import Lottie from 'lottie-react';
import PlantHealth from './components/PlantHealth';
import SmartFarming from './components/SmartFarming';
import CommunityExchange from './components/CommunityExchange';
import DecisionSupport from './components/DecisionSupport';
import DebugConsole from './components/DebugConsole';
import { ShadBadge, ShadCard } from './components/ui/shadcn';
import { apiService } from './api/client';
import gardeningLottie from './assets/gardening-lottie.json';
import './App.css';

const modules = [
  {
    id: 'plant-health',
    label: 'Plant Health',
    hint: '1 free scan',
    description: 'Upload a leaf image and receive diagnosis guidance.',
  },
  {
    id: 'smart-farming',
    label: 'Smart Farming',
    hint: 'care plans',
    description: 'Generate daily crop care tasks with reasons.',
  },
  {
    id: 'community',
    label: 'Exchange',
    hint: '1 free trade',
    description: 'Post harvest items and find local barter matches.',
  },
  {
    id: 'decision',
    label: 'Advisor',
    hint: '5 chats',
    description: 'Ask for crop, budget, space, and timeline advice.',
  },
];

const dashboardStats = [
  { label: 'Guest Access', value: '24h' },
  { label: 'Plant Scan', value: '1' },
  { label: 'Advisor Chats', value: '5' },
  { label: 'Trade Demo', value: '1' },
];

const crops = [
  {
    name: "Bird's Eye Chili",
    detail: '90 days harvest',
    tag: 'Full sun',
    image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Cherry Tomato',
    detail: '65 days harvest',
    tag: 'Daily water',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80',
  },
  {
    name: 'Kangkung',
    detail: 'Fast leafy crop',
    tag: 'Humid',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80',
  },
];

const communities = [
  {
    name: 'Perumahan Tanjung Malim',
    meta: '428 members',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Taman Seri Bayu',
    meta: '156 members',
    image: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Desa Aman Growers',
    meta: '89 members',
    image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=500&q=80',
  },
];

const pageMotion = {
  initial: { opacity: 0, y: 18, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.42, ease: [0.2, 0.8, 0.2, 1] },
};

const revealMotion = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.22 },
  transition: { duration: 0.68, ease: [0.2, 0.8, 0.2, 1] },
};

function App() {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('kebunkita_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [notice, setNotice] = useState('');

  const showNotice = (message) => {
    setNotice(message);
    window.clearTimeout(showNotice.timer);
    showNotice.timer = window.setTimeout(() => setNotice(''), 5000);
  };

  const handleSetUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem('kebunkita_user', JSON.stringify(nextUser));
    localStorage.setItem('kebunkita_userId', nextUser.id);
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('kebunkita_user');
    localStorage.removeItem('kebunkita_userId');
    showNotice('Guest session cleared.');
  };

  return (
    <HashRouter>
      <div className="app-shell">
        <SiteHeader user={user} onSignOut={handleSignOut} />
        {notice && <div className="toast">{notice}</div>}

        <AnimatedRoutes user={user} onSetUser={handleSetUser} onError={showNotice} />

        <SiteFooter />
        <DebugConsole userId={user?.id || ''} />
      </div>
    </HashRouter>
  );
}

function AnimatedRoutes({ user, onSetUser, onError }) {
  const location = useLocation();
  useScrollReveal(location.pathname);

  return (
    <motion.div className="route-transition" key={location.pathname} {...pageMotion}>
      <Routes location={location}>
        <Route path="/" element={<Homepage />} />
        <Route
          path="/guest"
          element={<GuestPage user={user} onSetUser={onSetUser} onError={onError} />}
        />
        <Route
          path="/dashboard"
          element={<DashboardPage user={user} onError={onError} />}
        />
        <Route path="/community" element={<CommunityPage user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </motion.div>
  );
}

function useScrollReveal(routeKey) {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll('.reveal'));
    if (!targets.length) return undefined;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -72px 0px' }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [routeKey]);
}

function SiteHeader({ user, onSignOut }) {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="KebunKita home">
        <img className="brand-logo" src="/logo.png" alt="" />
        <span>KebunKita</span>
      </Link>
      <nav className="header-nav" aria-label="Main navigation">
        <Link to="/guest">Guest Login</Link>
      </nav>
      {user && (
        <div className="header-actions">
          <button className="ghost-button" type="button" onClick={onSignOut}>
            Reset guest
          </button>
        </div>
      )}
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <span className="footer-label">Supported by</span>
        <p>KebunKita is developed with academic and technology ecosystem support.</p>
      </div>
      <div className="footer-logo-row" aria-label="Partner logos">
        <img src="/partners/upsi-logo.png" alt="Universiti Pendidikan Sultan Idris" />
        <img src="/partners/meta-logo.png" alt="Fakulti Komputeran dan Meta Teknologi" />
      </div>
    </footer>
  );
}

function Homepage() {
  return (
    <main className="premium-home">
      <Container maxWidth="xl" className="premium-home-container">
        <AgriMotion />
        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center" className="premium-hero-grid">
          <Grid item xs={12} lg={6}>
            <Stack component={motion.div} spacing={4} className="premium-copy" {...revealMotion}>
              <Stack spacing={2}>
                <ShadBadge>Urban farming platform</ShadBadge>
                <Typography component="h1" className="premium-title">
                  Grow at home. Share with your neighborhood.
                </Typography>
                <Typography className="premium-subtitle">
                  KebunKita brings plant diagnosis, crop care planning, and local harvest exchange
                  into one calm workspace for beginner growers.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <Button
                  component={Link}
                  to="/guest"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardRoundedIcon />}
                  className="mui-primary-cta"
                >
                  Sign up as guest
                </Button>
                <Button
                  component={Link}
                  to="/community"
                  variant="outlined"
                  size="large"
                  className="mui-secondary-cta"
                >
                  Explore community
                </Button>
              </Stack>

              <Grid container spacing={1.5} className="premium-metrics">
                <Grid item xs={4}>
                  <motion.div {...revealMotion} transition={{ ...revealMotion.transition, delay: 0.1 }}>
                    <ShadCard>
                    <strong>4</strong>
                    <span>Live modules</span>
                    </ShadCard>
                  </motion.div>
                </Grid>
                <Grid item xs={4}>
                  <motion.div {...revealMotion} transition={{ ...revealMotion.transition, delay: 0.18 }}>
                    <ShadCard>
                    <strong>24h</strong>
                    <span>Guest access</span>
                    </ShadCard>
                  </motion.div>
                </Grid>
                <Grid item xs={4}>
                  <motion.div {...revealMotion} transition={{ ...revealMotion.transition, delay: 0.26 }}>
                    <ShadCard>
                    <strong>FCM</strong>
                    <span>Ready flow</span>
                    </ShadCard>
                  </motion.div>
                </Grid>
              </Grid>
            </Stack>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Stack spacing={2.4} className="premium-media-stack">
              <motion.section
                className="media-explainer-section"
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.72, ease: [0.2, 0.8, 0.2, 1], delay: 0.05 }}
              >
                <Box className="premium-video-shell">
                  <iframe
                    src="https://www.youtube.com/embed/IpuKaroTPUg"
                    title="KebunKita product video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </Box>
                <div className="media-explainer-copy">
                  <ShadBadge>Product video</ShadBadge>
                  <Typography component="h2">See KebunKita in motion.</Typography>
                  <Typography>
                    The video introduces the core demo experience: sharing garden progress,
                    connecting with nearby growers, and moving users toward the live web
                    functions.
                  </Typography>
                </div>
              </motion.section>

              <motion.section
                className="media-explainer-section"
                initial={{ opacity: 0, y: 22, scale: 0.985 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.72, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
              >
                <Box className="premium-visual-shell">
                  <img
                    src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1400&q=88"
                    alt="Fresh vegetables from a local garden"
                  />
                  <motion.div
                    className="premium-dashboard-motion"
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.58, delay: 0.28 }}
                  >
                    <ShadCard className="premium-dashboard-card">
                      <Stack spacing={1.45}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <div>
                            <Typography className="dashboard-eyebrow">KebunKita</Typography>
                            <Typography className="dashboard-title">Hello, Ahmad!</Typography>
                          </div>
                          <ShadBadge>2 Active Crops</ShadBadge>
                        </Stack>
                        <Typography className="dashboard-subtitle">
                          Your garden is looking vibrant today.
                        </Typography>
                        <div className="dashboard-crop-row">
                          <span>Chili Padi</span>
                          <strong>Moisture 85%</strong>
                        </div>
                        <div className="dashboard-crop-row">
                          <span>Kangkung</span>
                          <strong>Harvest 12 days</strong>
                        </div>
                        <div className="dashboard-help-title">Plant Help</div>
                        <div className="dashboard-help-item">AI Diagnosis</div>
                        <div className="dashboard-help-item">Growth Guide</div>
                      </Stack>
                    </ShadCard>
                  </motion.div>
                </Box>
                <div className="media-explainer-copy">
                  <ShadBadge>Garden workspace</ShadBadge>
                  <Typography component="h2">A calm overview for beginner growers.</Typography>
                  <Typography>
                    This section shows how KebunKita summarizes crop status, active plants,
                    moisture cues, harvest timing, and plant-help actions in one simple garden
                    dashboard.
                  </Typography>
                </div>
              </motion.section>
            </Stack>
          </Grid>
        </Grid>

        <Grid container spacing={2.4} className="product-story-grid">
          {[
            {
              image: '/screens/community-barter-ai.png',
              title: 'Community exchange and barter flow',
              text:
                'Growers can chat with nearby neighbors, propose a harvest swap, review available crops, and complete a barter using one connected community workflow.',
            },
            {
              image: '/screens/plant-health-ai.png',
              title: 'AI plant health diagnosis',
              text:
                'The plant health function guides users to scan an affected leaf area, then displays health status and confidence feedback for quick care decisions.',
            },
          ].map((section, index) => (
            <Grid item xs={12} key={section.title}>
              <motion.section
                className="product-story-section"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.18 }}
                transition={{ duration: 0.68, ease: [0.2, 0.8, 0.2, 1], delay: index * 0.08 }}
              >
                <img src={section.image} alt={section.title} />
                <div>
                  <ShadBadge>{index === 0 ? 'Community function' : 'Plant health function'}</ShadBadge>
                  <Typography component="h2">{section.title}</Typography>
                  <Typography>{section.text}</Typography>
                </div>
              </motion.section>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2.2} className="premium-feature-row">
          {[
            {
              icon: <SpaRoundedIcon />,
              title: 'Plant health',
              text: 'Upload plant photos and receive practical diagnosis guidance.',
            },
            {
              icon: <GroupsRoundedIcon />,
              title: 'Community hubs',
              text: 'Discover local growers and keep small-space gardening social.',
            },
            {
              icon: <SwapHorizRoundedIcon />,
              title: 'Harvest exchange',
              text: 'Turn surplus crops into simple neighborhood barter moments.',
            },
          ].map((feature) => (
            <Grid item xs={12} md={4} key={feature.title}>
              <motion.div {...revealMotion}>
                <ShadCard className="premium-feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <strong>{feature.title}</strong>
                <p>{feature.text}</p>
                </ShadCard>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>
    </main>
  );
}

function AgriMotion() {
  return (
    <motion.div
      className="lottie-motion"
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
    >
      <Lottie animationData={gardeningLottie} loop autoplay />
    </motion.div>
  );
}

function GuestPage({ user, onSetUser, onError }) {
  const [guestName, setGuestName] = useState('Ahmad Farmer');
  const [location, setLocation] = useState('Tanjung Malim');
  const [creatingGuest, setCreatingGuest] = useState(false);
  const navigate = useNavigate();

  const handleCreateGuest = async (event) => {
    event.preventDefault();
    setCreatingGuest(true);
    try {
      const response = await apiService.createGuest(guestName, location);
      onSetUser(response.data);
      navigate('/dashboard');
    } catch (error) {
      onError(`Guest setup failed: ${error.debugInfo?.message || error.message}`);
    } finally {
      setCreatingGuest(false);
    }
  };

  return (
    <main className="page-shell guest-page">
      <section className="page-copy reveal reveal-up">
        <span className="eyebrow">Guest login</span>
        <h1>Start KebunKita without a password.</h1>
        <p>
          Create a temporary guest account for the web demo. Your guest account unlocks the live
          function dashboard and keeps hackathon usage limits clear.
        </p>
        <div className="guest-benefits">
          <span>1 plant diagnosis scan</span>
          <span>1 barter/trade demo</span>
          <span>5 advisor messages</span>
        </div>
      </section>

      {user ? (
        <section className="session-card large-session reveal reveal-up delay-1">
          <div>
            <span className="muted-label">Current guest session</span>
            <strong>{user.full_name || 'Guest Grower'}</strong>
            <span>{user.location_text || 'No area set'}</span>
          </div>
          <code>{user.id}</code>
          <Link className="primary-link" to="/dashboard">Open dashboard</Link>
        </section>
      ) : (
        <form className="guest-card guest-card-page reveal reveal-up delay-1" onSubmit={handleCreateGuest}>
          <label>
            Guest name
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Your name"
            />
          </label>
          <label>
            Area
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Neighborhood"
            />
          </label>
          <button className="primary-button" disabled={creatingGuest} type="submit">
            {creatingGuest ? 'Creating guest...' : 'Create guest account'}
          </button>
          <small className="form-note">No password needed. Guest sessions are temporary.</small>
        </form>
      )}
    </main>
  );
}

function DashboardPage({ user, onError }) {
  const [activeTab, setActiveTab] = useState('plant-health');
  const activeModule = useMemo(
    () => modules.find((module) => module.id === activeTab),
    [activeTab]
  );

  return (
    <main className="dashboard-section">
      <div className="dashboard-heading reveal reveal-up">
        <div>
          <span className="eyebrow">Function dashboard</span>
          <h1>{user ? `Welcome, ${user.full_name || 'Guest Grower'}` : 'Start with a guest account'}</h1>
          <p>
            Choose one live KebunKita function. Each module connects directly to the FastAPI
            backend and Supabase workflow.
          </p>
        </div>
        <div className="stat-strip">
          {dashboardStats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-grid">
        <aside className="side-panel reveal reveal-up delay-1">
          <h2>Guest Dashboard</h2>
          <div className="limit-list">
            <span>Plant scan: 1</span>
            <span>Trade: 1</span>
            <span>Advisor chat: 5</span>
            <span>Flutter app: full access</span>
          </div>
          <div className="function-list">
            {modules.map((module) => (
              <button
                key={module.id}
                type="button"
                className={activeTab === module.id ? 'active' : ''}
                onClick={() => setActiveTab(module.id)}
              >
                <strong>{module.label}</strong>
                <span>{module.description}</span>
              </button>
            ))}
          </div>
          <div className="crop-stack">
            {crops.map((crop) => (
              <article className="crop-card" key={crop.name}>
                <img src={crop.image} alt={crop.name} />
                <div>
                  <strong>{crop.name}</strong>
                  <span>{crop.detail}</span>
                  <small>{crop.tag}</small>
                </div>
              </article>
            ))}
          </div>
        </aside>

        <section className="workspace-panel reveal reveal-up delay-2">
          <div className="workspace-head">
            <div>
              <span className="muted-label">Active module</span>
              <h2>{activeModule.label}</h2>
            </div>
            <span className="module-hint">{activeModule.hint}</span>
          </div>

          <nav className="module-tabs" aria-label="KebunKita modules">
            {modules.map((module) => (
              <button
                key={module.id}
                type="button"
                className={activeTab === module.id ? 'active' : ''}
                onClick={() => setActiveTab(module.id)}
              >
                <span>{module.label}</span>
                <small>{module.hint}</small>
              </button>
            ))}
          </nav>

          {!user ? (
            <div className="empty-state">
              <h3>Guest login required</h3>
              <p>Create a temporary account first, then this dashboard unlocks the live functions.</p>
              <Link className="primary-link" to="/guest">Sign up as guest</Link>
            </div>
          ) : (
            <div className="module-body">
              {activeTab === 'plant-health' && (
                <PlantHealth userId={user.id} onError={onError} />
              )}
              {activeTab === 'smart-farming' && (
                <SmartFarming userId={user.id} onError={onError} />
              )}
              {activeTab === 'community' && (
                <CommunityExchange userId={user.id} onError={onError} />
              )}
              {activeTab === 'decision' && (
                <DecisionSupport userId={user.id} onError={onError} />
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CommunityPage({ user }) {
  return (
    <main className="page-shell community-page">
      <section className="page-copy reveal reveal-up">
        <span className="eyebrow">Community</span>
        <h1>Find your people and grow locally.</h1>
        <p>
          Join nearby grower groups, discover local harvest activity, and open the exchange flow
          when you are ready to barter.
        </p>
        <div className="hero-actions">
          <Link className="primary-link" to="/dashboard">Open exchange dashboard</Link>
          {!user && <Link className="secondary-link" to="/guest">Sign up as guest</Link>}
        </div>
      </section>

      <section className="community-board reveal reveal-up delay-1">
        <div className="community-search">Search your neighborhood, for example Tanjung Malim</div>
        <div className="community-list">
          {communities.map((community) => (
            <article className="community-card" key={community.name}>
              <img src={community.image} alt={community.name} />
              <div>
                <strong>{community.name}</strong>
                <span>{community.meta} - Active now</span>
              </div>
              <button type="button">Join</button>
            </article>
          ))}
        </div>
        <div className="community-actions">
          <article>
            <strong>Map View</strong>
            <span>Explore nearby garden hubs.</span>
          </article>
          <article>
            <strong>Create Hub</strong>
            <span>Start a group for your area.</span>
          </article>
        </div>
      </section>
    </main>
  );
}

export default App;
