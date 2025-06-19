// Primero que nada, cargo mis variables de entorno del archivo .env.
// Esto es clave para no exponer mi API Key en el código.
require("dotenv").config();
console.log("Environment variables loaded. PORT:", process.env.PORT);
console.log(
  "SPOONACULAR_API_KEY loaded (first 5 characters):",
  process.env.SPOONACULAR_API_KEY
    ? process.env.SPOONACULAR_API_KEY.substring(0, 5)
    : "NOT DEFINED" // Si no la encuentra, quiero saberlo enseguida.
);

// Aquí importo las librerías que necesito para que mi servidor funcione.
// express: para crear el servidor web y manejar rutas.
// cors: para permitir que mi frontend (en otro puerto) hable con este backend.
// axios: para hacer peticiones HTTP a la API de Spoonacular.
// path: para trabajar con rutas de archivos (necesario para servir el frontend).
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const path = require("path");

// Creo la instancia de mi aplicación Express.
const app = express();

// Defino en qué puerto va a escuchar mi servidor. Si no hay nada en .env, uso el 5000 por defecto.
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- Configuración para servir archivos estáticos del frontend ---

app.use(express.static(path.join(__dirname, "../client/dist")));

// --- RUTAS DE LA API ---

// Ruta para obtener una receta aleatoria de la API de Spoonacular.
app.get("/api/recetas", async (req, res) => {
  const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

  if (!SPOONACULAR_API_KEY) {
    console.error("Error: SPOONACULAR_API_KEY is not defined in the .env file");
    return res.status(500).json({
      message: "Spoonacular API Key not configured on the server.",
    });
  }

  try {
    const url = `https://api.spoonacular.com/recipes/random?number=1&apiKey=${SPOONACULAR_API_KEY}`;
    const response = await axios.get(url);
    const recipe = response.data.recipes[0];

    if (recipe) {
      const ingredients = recipe.extendedIngredients
        ? recipe.extendedIngredients.map((ing) => ing.original || ing.name)
        : [];

      const cleanedRecipe = {
        id: recipe.id,
        nombre: recipe.title,
        imagen: recipe.image,
        instrucciones: recipe.instructions || "No instructions available.",
        ingredientes: ingredients,
      };

      res.json(cleanedRecipe);
    } else {
      res.status(404).json({ message: "No random recipe found." });
    }
  } catch (error) {
    console.error(
      "Error getting random recipes from Spoonacular:",
      error.message
    );
    if (error.response) {
      console.error("API error data:", error.response.data);
      console.error("API error status:", error.response.status);
    }
    res.status(500).json({
      message: "Internal server error processing random recipe request.",
    });
  }
});

// --- Ruta para buscar recetas por lo que el usuario escriba  ---
app.get("/api/recetas/search", async (req, res) => {
  const query = req.query.query;
  const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

  console.log(`[BACKEND] Search request received for query: "${query}"`);

  if (!SPOONACULAR_API_KEY) {
    console.error("Error: SPOONACULAR_API_KEY is not defined in the .env file");
    return res
      .status(500)
      .json({ message: "Spoonacular API Key not configured on the server." });
  }

  if (!query) {
    return res
      .status(400)
      .json({ message: "A 'query' parameter is required for the search." });
  }

  try {
    const searchUrl = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(
      query
    )}&number=1&apiKey=${SPOONACULAR_API_KEY}`;
    console.log(
      `[BACKEND] Making Spoonacular complexSearch request: ${searchUrl}`
    );
    const searchResponse = await axios.get(searchUrl);

    if (searchResponse.data.results && searchResponse.data.results.length > 0) {
      const firstResultId = searchResponse.data.results[0].id;
      console.log(
        `[BACKEND] Recipe found from complexSearch (ID): ${firstResultId}`
      );

      const detailsUrl = `https://api.spoonacular.com/recipes/${firstResultId}/information?apiKey=${SPOONACULAR_API_KEY}`;
      console.log(`[BACKEND] Obtaining details for: ${detailsUrl}`);
      const detailsResponse = await axios.get(detailsUrl);

      const detailedRecipe = detailsResponse.data;

      const ingredients = detailedRecipe.extendedIngredients
        ? detailedRecipe.extendedIngredients.map(
            (ing) => ing.original || ing.name
          )
        : [];

      const cleanedRecipe = {
        id: detailedRecipe.id,
        nombre: detailedRecipe.title,
        imagen: detailedRecipe.image,
        instrucciones:
          detailedRecipe.instructions || "No instructions available.",
        ingredientes: ingredients,
      };
      console.log("[BACKEND] Cleaned recipe prepared and sent to frontend.");
      return res.json(cleanedRecipe);
    } else {
      console.log(
        `[BACKEND] No results found in complexSearch for query: "${query}"`
      );
      return res
        .status(404)
        .json({ message: "No recipes found for your search." });
    }
  } catch (error) {
    console.error("[BACKEND] Error searching recipes in Spoonacular:");
    if (error.response) {
      console.error("  Status:", error.response.status);
      console.error("  Data:", error.response.data);
      if (error.response.status === 402) {
        return res.status(402).json({
          message:
            "Spoonacular API daily request limit reached. Try again tomorrow.",
        });
      }
      if (error.response.status === 404 && error.response.data.message) {
        return res.status(404).json({ message: error.response.data.message });
      }
    } else if (error.request) {
      console.error("  No response received from Spoonacular server.");
      console.error("  Request:", error.request);
    } else {
      console.error("  Error message:", error.message);
    }
    res.status(500).json({
      message: "Internal server error getting search results from Spoonacular.",
    });
  }
});

// --- IMPORTANTE: "Catch-all" para el frontend ---
// Para cualquier ruta que no sea una de nuestras APIs, servimos el archivo index.html de React.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

// Finalmente, inicio mi servidor y lo pongo a escuchar en el puerto definido.
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
