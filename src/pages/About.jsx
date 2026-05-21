import React from "react";
import headshot from "../assets/mllheadshot.jpg";

export default function About() {
  return (
    <section style={pageStyle}>
      <div style={containerStyle}>
        <h2 style={mainTitleStyle}>About Fizzrix’s Massive Modulatorium</h2>
        
        {/* Developer Section */}
        <div style={sectionStyle}>
          <div style={developerSectionStyle}>
            <div style={photoPlaceholderStyle}>
              {/* Photo - replace the URL below with your actual photo URL */}
              <img 
                src="https://media.licdn.com/dms/image/v2/C5603AQGbx1i-xFtWBQ/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1626375868743?e=1759968000&v=beta&t=O4BQkc7vcx-IkCaRMkxzwVQIEnrKld3QWZj0f3VE9Jk" 
                alt="Matthew - Developer"
                style={photoImageStyle}
              />
            </div>
            <div style={bioStyle}>
              <h3 style={sectionTitleStyle}>Meet the Developer</h3>
              <p style={textStyle}>
                Hi! I'm Matthew, a passionate developer and D&D enthusiast. I created Fizzrix’s Massive Modulatorium 
                to solve the challenge of organizing and running complex tabletop RPG campaigns. As both a developer 
                and a long time player of TTRPGS, I understand the need for tools that make campaign management intuitive and efficient.
              </p>
              <p style={textStyle}>
                When I'm not coding or playing D&D sessions, you can find me gaming, spending time with family, or on a mountain biking trail. 
                I believe in building tools that bring people together and enhance creative storytelling.
              </p>
            </div>
          </div>
        </div>

        {/* Project Overview */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>What is Fizzrix’s Massive Modulatorium?</h3>
          <p style={textStyle}>
            Fizzrix’s Massive Modulatorium is a modern web application designed specifically for Dungeon Masters 
            and tabletop RPG enthusiasts. It provides a streamlined way to organize, manage, and run 
            campaign modules with features like:
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>📚 <strong>Module Organization:</strong> Create and manage campaign modules with episodes, monsters, and magic items</li>
            <li style={listItemStyle}>🎮 <strong>Session Dashboard:</strong> Dynamic dashboard for real-time campaign management</li>
            <li style={listItemStyle}>👥 <strong>Player Management:</strong> Track player information and contact preferences</li>
            <li style={listItemStyle}>🔒 <strong>Session Locking:</strong> Prevent accidental changes during active gameplay</li>
            <li style={listItemStyle}>🖼️ <strong>Visual Content:</strong> Support for images and rich content in your campaigns</li>
          </ul>
        </div>

        {/* Tech Stack */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Technology Stack</h3>
          <div style={techGridStyle}>
            <div style={techItemStyle}>
              <div style={techIconStyle}>⚛️</div>
              <div>
                <strong>React 19</strong>
                <p style={techDescStyle}>Modern React with hooks and functional components for a responsive UI</p>
              </div>
            </div>
            <div style={techItemStyle}>
              <div style={techIconStyle}>⚡</div>
              <div>
                <strong>Vite</strong>
                <p style={techDescStyle}>Lightning-fast development and build tool for optimal performance</p>
              </div>
            </div>
            <div style={techItemStyle}>
              <div style={techIconStyle}>🗄️</div>
              <div>
                <strong>Supabase</strong>
                <p style={techDescStyle}>PostgreSQL database with real-time capabilities and file storage</p>
              </div>
            </div>
            <div style={techItemStyle}>
              <div style={techIconStyle}>🎨</div>
              <div>
                <strong>CSS Variables</strong>
                <p style={techDescStyle}>Modern CSS with custom properties for dynamic theming</p>
              </div>
            </div>
            <div style={techItemStyle}>
              <div style={techIconStyle}>🔀</div>
              <div>
                <strong>React Router</strong>
                <p style={techDescStyle}>Client-side routing for a seamless single-page application experience</p>
              </div>
            </div>
            <div style={techItemStyle}>
              <div style={techIconStyle}>🎯</div>
              <div>
                <strong>@dnd-kit</strong>
                <p style={techDescStyle}>Drag-and-drop functionality for intuitive dashboard management</p>
              </div>
            </div>
          </div>
        </div>

        {/* Development Journey */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Development Journey</h3>
          <p style={textStyle}>
            This project started from a simple need: better organization of D&D campaign materials. 
            Traditional methods like spreadsheets and documents felt clunky and disconnected. 
            I wanted something visual, interactive, and designed specifically for the way DMs think and work.
          </p>
          <p style={textStyle}>
            The biggest challenges were designing an intuitive drag-and-drop interface, implementing 
            real-time data synchronization, and creating a flexible content management system that 
            could handle various types of campaign content. The reward has been seeing how the tool 
            streamlines campaign preparation and enhances the gaming experience.
          </p>
        </div>

        {/* Future Features */}
        <div style={sectionStyle}>
          <h3 style={sectionTitleStyle}>Upcoming Features</h3>
          <div style={futureGridStyle}>
            <div style={featureCardStyle}>
              <h4 style={featureTitleStyle}>📱 Whisper System</h4>
              <p style={featureDescStyle}>Send targeted messages to specific players without others seeing</p>
            </div>
            <div style={featureCardStyle}>
              <h4 style={featureTitleStyle}>📧 Content Sharing</h4>
              <p style={featureDescStyle}>Email or text campaign content directly to players</p>
            </div>
            <div style={featureCardStyle}>
              <h4 style={featureTitleStyle}>🎲 Library</h4>
              <p style={featureDescStyle}>Build a library to share your homebrew and custom sections with the world</p>
            </div>
            <div style={featureCardStyle}>
              <h4 style={featureTitleStyle}>📊 Campaign Analytics</h4>
              <p style={featureDescStyle}>Track player engagement and campaign progression</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <p style={footerTextStyle}>
            Built with ❤️ for the D&D community • Open to feedback and contributions
          </p>
          <div style={linksStyle}>
            <a href="https://github.com/Mll0032/fmm" style={linkStyle}>GitHub</a>
            <span style={separatorStyle}>•</span>
            <a href="mailto:mllawson18@gmail.com" style={linkStyle}>Contact</a>
          </div>
        </div>
      </div>
    </section>
  );
}

// Styles
const pageStyle = {
  padding: "20px 0",
  maxWidth: "1200px",
  margin: "0 auto"
};

const containerStyle = {
  display: "grid",
  gap: "32px"
};

const mainTitleStyle = {
  fontSize: "2.5rem",
  fontWeight: 700,
  color: "var(--text)",
  textAlign: "center",
  marginBottom: "8px"
};

const sectionStyle = {
  background: "var(--bg-elev)",
  borderRadius: "var(--radius)",
  border: "1px solid color-mix(in oklab, var(--text) 10%, transparent)",
  padding: "24px"
};

const sectionTitleStyle = {
  fontSize: "1.5rem",
  fontWeight: 600,
  color: "var(--text)",
  marginBottom: "16px"
};

const developerSectionStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(160px, 200px) 1fr",
  gap: "24px",
  alignItems: "start"
};

const photoPlaceholderStyle = {
  display: "flex",
  justifyContent: "center"
};

const photoStyle = {
  width: "160px",
  height: "160px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, var(--brand), var(--brand-2))",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "3px solid color-mix(in oklab, var(--text) 20%, transparent)"
};

const photoTextStyle = {
  color: "#0b0d12",
  fontWeight: 600,
  fontSize: "14px",
  textAlign: "center"
};

const photoImageStyle = {
  width: "160px",
  height: "160px",
  borderRadius: "50%",
  objectFit: "cover",
  border: "3px solid color-mix(in oklab, var(--text) 20%, transparent)"
};

const bioStyle = {
  display: "grid",
  gap: "12px"
};

const textStyle = {
  lineHeight: 1.6,
  color: "var(--text)",
  margin: "0"
};

const listStyle = {
  display: "grid",
  gap: "8px",
  paddingLeft: "0",
  listStyle: "none"
};

const listItemStyle = {
  padding: "8px 0",
  color: "var(--text)"
};

const techGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: "16px"
};

const techItemStyle = {
  display: "flex",
  gap: "12px",
  padding: "16px",
  background: "var(--surface)",
  borderRadius: "8px",
  border: "1px solid color-mix(in oklab, var(--text) 8%, transparent)"
};

const techIconStyle = {
  fontSize: "24px",
  minWidth: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const techDescStyle = {
  fontSize: "14px",
  color: "var(--muted)",
  margin: "4px 0 0 0",
  lineHeight: 1.4
};

const futureGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px"
};

const featureCardStyle = {
  padding: "16px",
  background: "var(--surface)",
  borderRadius: "8px",
  border: "1px solid color-mix(in oklab, var(--text) 8%, transparent)"
};

const featureTitleStyle = {
  margin: "0 0 8px 0",
  fontSize: "1.1rem",
  color: "var(--text)"
};

const featureDescStyle = {
  margin: "0",
  fontSize: "14px",
  color: "var(--muted)",
  lineHeight: 1.4
};

const footerStyle = {
  textAlign: "center",
  padding: "24px 0",
  borderTop: "1px solid color-mix(in oklab, var(--text) 10%, transparent)"
};

const footerTextStyle = {
  color: "var(--muted)",
  margin: "0 0 12px 0"
};

const linksStyle = {
  display: "flex",
  gap: "8px",
  justifyContent: "center",
  alignItems: "center"
};

const linkStyle = {
  color: "var(--brand)",
  textDecoration: "none",
  fontWeight: 500,
  transition: "color 0.2s ease"
};

const separatorStyle = {
  color: "var(--muted)"
};
