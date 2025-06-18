import React, { useState } from "react";

function RecipeOptions({ onSelectOption }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault(); //  evita que el formulario recargue toda la página.
    if (searchTerm.trim()) {
      onSelectOption("search", searchTerm.trim());
    }
  };

  return (
    <div className="options-page-container">
      <h2 className="options-title">What Are We Cooking Today?</h2>

      <div className="options-section">
        <button
          className="option-button random-button"
          onClick={() => onSelectOption("random")} // Le digo a App.jsx que quiero una receta random.
        >
          Random Recipe!
        </button>
        <p className="option-divider">or</p>
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="Search by name or ingredient..." // Texto de ayuda.
            className="search-input"
            value={searchTerm} // Conecto el valor del input a mi estado.
            onChange={(e) => setSearchTerm(e.target.value)} // Cada vez que el usuario escribe, actualizo el estado.
            id="recipe-search-input" // Añadido para accesibilidad y autocompletado del navegador.
            name="searchQuery"
          />
          <button type="submit" className="search-button">
            Search Recipe
          </button>
        </form>
      </div>

      {/* Aquí planeo añadir una sección para "Recetas Destacadas" más adelante . */}
    </div>
  );
}

export default RecipeOptions;
