import React, { useState, useRef, useEffect } from "react";

export default function SearchableDropdown({
  label,
  placeholder = "Search...",
  items = [],
  onSelect,
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter items based on search term
  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    onSelect(item);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && filteredItems.length > 0) {
      handleSelect(filteredItems[0]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  return (
    <div ref={dropdownRef} style={container}>
      <label style={labelStyle}>{label}</label>
      <div style={inputContainer}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            ...inputStyle,
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? "not-allowed" : "text"
          }}
        />
        {isOpen && !disabled && (
          <div style={dropdownStyle}>
            {filteredItems.length > 0 ? (
              <ul style={listStyle}>
                {filteredItems.map((item) => (
                  <li
                    key={item.key}
                    onClick={() => handleSelect(item)}
                    style={itemStyle}
                    onMouseEnter={(e) => {
                      e.target.style.background = "var(--brand)";
                      e.target.style.color = "#0b0d12";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = "transparent";
                      e.target.style.color = "var(--text)";
                    }}
                  >
                    + {item.label}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={noResultsStyle}>
                {searchTerm ? "No matches found" : "No items available"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const container = {
  position: "relative",
  display: "grid",
  gap: 6
};

const labelStyle = {
  fontSize: 14,
  color: "var(--muted)"
};

const inputContainer = {
  position: "relative"
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface)",
  color: "var(--text)",
  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
  borderRadius: 10,
  fontSize: 14,
  outline: "none"
};

const dropdownStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 1000,
  background: "var(--bg-elev)",
  border: "1px solid color-mix(in oklab, var(--text) 12%, transparent)",
  borderRadius: 10,
  marginTop: 4,
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  maxHeight: "200px",
  overflow: "hidden"
};

const listStyle = {
  margin: 0,
  padding: 0,
  listStyle: "none",
  maxHeight: "200px",
  overflowY: "auto"
};

const itemStyle = {
  padding: "10px 12px",
  cursor: "pointer",
  borderBottom: "1px solid color-mix(in oklab, var(--text) 8%, transparent)",
  transition: "background-color 0.2s"
};

const noResultsStyle = {
  padding: "10px 12px",
  color: "var(--muted)",
  fontStyle: "italic",
  textAlign: "center"
};