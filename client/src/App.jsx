import { useState, useEffect, useCallback } from "react";
import "./App.css";
import RecipeOptions from "./RecipeOptions";
function App() {
  // Mis estados principales para la receta.
  const [receta, setReceta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Este estado me ayuda a controlar qué parte de la app estoy mostrando al usuario.
  // Puede ser 'landing' (la pantalla inicial), 'options' (elegir receta), o 'displayRecipe' (mostrar una receta).
  const [currentView, setCurrentView] = useState("landing");

  // Lógica para sincronizar la vista con el hash de la URL.
  useEffect(() => {
    const updateViewFromHash = () => {
      const hash = window.location.hash.substring(1);
      if (hash === "options") {
        setCurrentView("options");
      } else if (hash === "displayRecipe") {
        setCurrentView("displayRecipe");
      } else {
        // Si no hay hash o no lo reconozco, vuelvo a la landing.
        setCurrentView("landing");
        // Además, me aseguro de que la URL muestre #landing si estoy recién cargando sin hash.
        if (window.location.hash === "" && hash !== "landing") {
          window.history.replaceState(null, "", "#landing");
        }
      }
    };

    // Al cargar la app, reviso el hash para saber dónde empezar.
    updateViewFromHash();

    // Escucho si el hash de la URL cambia
    window.addEventListener("hashchange", updateViewFromHash);

    //  limpio el "escuchador" cuando el componente se desmonta para evitar problemas.
    return () => window.removeEventListener("hashchange", updateViewFromHash);
  }, []);

  // Lógica para la animación del título "Cook Today!".
  const phrase = "Cook Today!";
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Solo disparo la animación de las letras si estoy en la landing page.
    if (currentView === "landing") {
      const timer = setTimeout(() => {
        setAnimated(true);
      }, 100); // Un pequeño retraso para que no sea instantáneo.
      return () => clearTimeout(timer); // Limpio el timer para evitar fugas de memoria.
    } else {
      setAnimated(false); // Si no estoy en la landing, reseteo la animación.
    }
  }, [currentView]); // Este efecto se ejecuta cada vez que 'currentView' cambia.

  // Función principal para pedir la receta a mi backend.
  // Uso `useCallback` para que la función no se recree innecesariamente cada vez que el componente se renderiza.
  const fetchReceta = useCallback(async (type, term = "") => {
    try {
      setLoading(true); // Indico que estoy cargando datos.
      setError(null); // Borro cualquier error anterior.

      let url = "/api/recetas"; // Si pides una receta aleatoria, solo llamas a '/api/recetas'
      if (type === "search" && term) {
        url = `/api/recetas/search?query=${encodeURIComponent(term)}`; // Para búsquedas, '/api/recetas/search'
      }
      const response = await fetch(url); // Hago la petición a mi backend.
      if (!response.ok) {
        // Si la respuesta no fue exitosa (ej. 404, 500).
        const errorData = await response.json(); // Intento leer el mensaje de error que me mandó el backend.
        // Lanzo un error con el mensaje que me dé el backend, o uno genérico si no lo hay.
        throw new Error(
          errorData.message || `Failed to fetch ${type} recipe from server.`
        );
      }
      const data = await response.json(); // Si todo salió bien, parseo la respuesta JSON.

      setReceta(data); // Guardo la receta en mi estado.
      // Y lo más importante: cambio el hash de la URL para que muestre la vista de la receta.
      // El 'useEffect' que escucha los cambios de hash se encargará de actualizar 'currentView'.
      window.location.hash = "displayRecipe";
    } catch (err) {
      console.error("Error fetching recipe:", err); // Mando el error a la consola para depurar.
      setError(err.message); // Guardo el mensaje de error para mostrarlo al usuario.

      window.location.hash = "displayRecipe";
    } finally {
      setLoading(false);
    }
  }, []);

  // Esta función se la paso al componente RecipeOptions.
  // Cuando el usuario hace clic en "Random" o "Search", esta función se activa.
  const handleOptionSelected = (optionType, term = "") => {
    fetchReceta(optionType, term);
  };

  // Esta función me ayuda a navegar entre las vistas cambiando el hash de la URL.
  const navigateTo = useCallback((view) => {
    window.location.hash = view;
  }, []);

  // --- Renderizado Condicional Principal ---
  // Esto decide qué UI mostrarle al usuario según el estado 'currentView'.

  // 1. Vista de la Landing Page: Solo el título animado y el botón de inicio.
  if (currentView === "landing") {
    return (
      <div className="landing-page-container">
        <h1 className="main-title-landing">
          {phrase.split("").map((char, index) => (
            <span
              key={index}
              className={`letter ${animated ? "animated" : ""}`}
              style={{
                animationDelay: `${index * 0.1}s`,
                "--random-rotation-start": Math.random() * 360 - 180,
                "--random-rotation-end": Math.random() * 10 - 5,
              }}
            >
              {char === " " ? "\u00A0" : char}{" "}
            </span>
          ))}
        </h1>
        {/* Botón para empezar a usar la aplicación. */}
        <button
          className="start-cooking-button"
          onClick={() => navigateTo("options")}
        >
          Start Cooking
        </button>
      </div>
    );
  }

  // 2. Vista de Opciones: Donde el usuario elige entre receta aleatoria o buscar.
  if (currentView === "options") {
    return (
      <div className="options-page-wrapper">
        <RecipeOptions onSelectOption={handleOptionSelected} />
      </div>
    );
  }

  // 3. Vista de la Receta (displayRecipe): Aquí muestro los detalles de la receta.
  if (currentView === "displayRecipe") {
    if (loading) {
      return <div className="app-status-message">Loading recipe...</div>;
    }

    // Si hubo un error al cargar, muestro el mensaje de error y un botón para volver.
    if (error) {
      return (
        <div className="app-status-message error-message">
          Error: {error}
          <button className="back-button" onClick={() => navigateTo("options")}>
            Back to Options
          </button>
        </div>
      );
    }

    // Si no se encontró ninguna receta muestro un mensaje y un botón para volver.
    if (!receta) {
      return (
        <div className="app-status-message no-recipe-message">
          No recipe could be loaded.
          <button className="back-button" onClick={() => navigateTo("options")}>
            Back to Options
          </button>
        </div>
      );
    }

    // Si todo está bien y tengo una receta, la muestro.
    return (
      <div className="app-container recipe-view-active">
        <main className="recipe-card">
          <h2 className="recipe-title">{receta.nombre}</h2>{" "}
          {receta.imagen ? ( // Si la receta trae una imagen, la muestro.
            <div className="recipe-image-container">
              <img
                src={receta.imagen}
                alt={receta.nombre}
                className="recipe-image"
              />
            </div>
          ) : (
            // Si no hay imagen de la API, muestro mi propia imagen por defecto.
            <div className="recipe-image-container">
              <img
                src="/images/default-recipe.jpg"
                alt="Default recipe image"
                className="recipe-image default"
              />
            </div>
          )}
          <h3 className="section-heading">Ingredients:</h3>
          <ul className="ingredients-list">
            {receta.ingredientes && receta.ingredientes.length > 0 ? (
              // Mapeo la lista de ingredientes si hay.
              receta.ingredientes.map((ing, index) => (
                <li key={index}>{ing}</li>
              ))
            ) : (
              <li>No ingredients listed.</li> // Mensaje si no hay ingredientes.
            )}
          </ul>
          <h3 className="section-heading">Instructions:</h3>
          <p
            className="instructions-text"
            dangerouslySetInnerHTML={{ __html: receta.instrucciones }}
          ></p>
        </main>

        <footer className="app-footer">
          <p>Data obtained from Spoonacular API.</p>
          <button
            className="back-button footer-back-button"
            onClick={() => navigateTo("options")}
          >
            Back to Options
          </button>
        </footer>
      </div>
    );
  }
}

export default App;
