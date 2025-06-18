// cargo mis variables de entorno del archivo .env.
// IMPORTANTE para no exponer mi API Key en el código.
require("dotenv").config();
console.log("Environment variables loaded. PORT:", process.env.PORT);
console.log(
  "SPOONACULAR_API_KEY loaded (first 5 characters):",
  process.env.SPOONACULAR_API_KEY
    ? process.env.SPOONACULAR_API_KEY.substring(0, 5)
    : "NOT DEFINED" // Si no la encuentra, quiero saberlo enseguida.
);

//  importo las librerías que necesito.
const express = require("express");
const cors = require("cors");
const axios = require("axios");

// Creo la instancia de mi aplicación Express.
const app = express();

// Defino en qué puerto va a escuchar mi servidor. Si no hay nada en .env, uso el 5000 por defecto.
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---

app.use(cors());
app.use(express.json());

// --- API ROUTES ---

// Esta es una ruta simple para probar que el servidor esté vivo.
app.get("/", (req, res) => {
  res.send("Recipe Today server is running!");
});

// Ruta para obtener una receta aleatoria de la API de Spoonacular.
app.get("/api/recetas", async (req, res) => {
  const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

  // Si por alguna razón la clave no está, debo avisar y devolver un error.
  if (!SPOONACULAR_API_KEY) {
    console.error("Error: SPOONACULAR_API_KEY is not defined in the .env file");
    return res.status(500).json({
      message: "Spoonacular API Key not configured on the server.",
    });
  }

  try {
    // URL para pedir una receta al azar.
    const url = `https://api.spoonacular.com/recipes/random?number=1&apiKey=${SPOONACULAR_API_KEY}`;

    // Hago la petición real a Spoonacular.
    const response = await axios.get(url);
    const recipe = response.data.recipes[0];
    // Si encontré una receta, la proceso y la envío.
    if (recipe) {
      const ingredients = recipe.extendedIngredients
        ? recipe.extendedIngredients.map((ing) => ing.original || ing.name)
        : [];

      // Armo un objeto más simple y fácil de usar para mi frontend.
      const cleanedRecipe = {
        id: recipe.id,
        nombre: recipe.title,
        imagen: recipe.image,
        instrucciones: recipe.instructions || "No instructions available.", // Si no hay instrucciones, pongo un texto por defecto.
        ingredientes: ingredients,
      };

      res.json(cleanedRecipe); // Envío la receta limpia en formato JSON.
    } else {
      // Si por alguna razón no se encontró una receta, devuelvo un 404.
      res.status(404).json({ message: "No random recipe found." });
    }
  } catch (error) {
    // Si algo sale mal en la petición, lo registro y envío un error 500.
    console.error(
      "Error getting random recipes from Spoonacular:",
      error.message
    );
    // Intento dar más detalles si el error viene de la respuesta de la API.
    if (error.response) {
      console.error("API error data:", error.response.data);
      console.error("API error status:", error.response.status);
    }
    res.status(500).json({
      message: "Internal server error processing random recipe request.",
    });
  }
});

// --- ruta Para buscar recetas por lo que el usuario escriba (nombre o ingrediente) ---
app.get("/api/recetas/search", async (req, res) => {
  const query = req.query.query;
  const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;

  // Un log para ver qué query me está llegando.
  console.log(`[BACKEND] Search request received for query: "${query}"`);

  // Otra vez, chequeo si la API Key está definida.
  if (!SPOONACULAR_API_KEY) {
    console.error("Error: SPOONACULAR_API_KEY is not defined in the .env file");
    return res
      .status(500)
      .json({ message: "Spoonacular API Key not configured on the server." });
  }

  // Si no me mandaron un término de búsqueda, devuelvo un error.
  if (!query) {
    return res
      .status(400)
      .json({ message: "A 'query' parameter is required for the search." });
  }

  try {
    // 1. Primero, hago una petición de búsqueda "compleja" a Spoonacular.
    // `encodeURIComponent` es importante para que si el query tiene espacios o caracteres especiales, la URL no se rompa.
    const searchUrl = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(
      query
    )}&number=1&apiKey=${SPOONACULAR_API_KEY}`;
    console.log(
      `[BACKEND] Making Spoonacular complexSearch request: ${searchUrl}`
    ); // Log para depurar qué URL estoy usando.
    const searchResponse = await axios.get(searchUrl);
    console.log(
      `[BACKEND] complexSearch response received. Status: ${searchResponse.status}`
    ); // Log el estado de la respuesta.

    // Si la búsqueda inicial me devuelve resultados...
    if (searchResponse.data.results && searchResponse.data.results.length > 0) {
      // Tomo el ID de la primera receta que encontró.
      const firstResultId = searchResponse.data.results[0].id;
      console.log(
        `[BACKEND] Recipe found from complexSearch (ID): ${firstResultId}`
      ); // Otro log para mi.

      // 2. Con ese ID, hago una segunda petición para obtener *todos los detalles* de esa receta.
      const detailsUrl = `https://api.spoonacular.com/recipes/${firstResultId}/information?apiKey=${SPOONACULAR_API_KEY}`;
      console.log(
        `[BACKEND] Making Spoonacular details request: ${detailsUrl}`
      ); // Log para la segunda llamada.
      const detailsResponse = await axios.get(detailsUrl);
      console.log(
        `[BACKEND] Details response received. Status: ${detailsResponse.status}`
      ); // Log el estado de la segunda respuesta.

      const detailedRecipe = detailsResponse.data;

      const ingredients = detailedRecipe.extendedIngredients
        ? detailedRecipe.extendedIngredients.map(
            (ing) => ing.original || ing.name
          )
        : [];

      // Armo el objeto de receta limpio para mi frontend.
      const cleanedRecipe = {
        id: detailedRecipe.id,
        nombre: detailedRecipe.title,
        imagen: detailedRecipe.image,
        instrucciones:
          detailedRecipe.instructions || "No instructions available.",
        ingredientes: ingredients,
      };
      console.log("[BACKEND] Cleaned recipe prepared and sent to frontend."); // Confirmación para mi.
      return res.json(cleanedRecipe); // Envío la receta detallada al frontend.
    } else {
      // Si la búsqueda inicial no encontró nada, aviso al frontend.
      console.log(
        `[BACKEND] No results found in complexSearch for query: "${query}"`
      ); // Log si no hay resultados.
      return res
        .status(404)
        .json({ message: "No recipes found for your search." });
    }
  } catch (error) {
    // Manejo de errores para ambas peticiones.
    console.error("[BACKEND] Error searching recipes in Spoonacular:");
    if (error.response) {
      // Si hay una respuesta de error de la API
      console.error("  Status:", error.response.status);
      console.error("  Data:", error.response.data);
      if (error.response.status === 402) {
        // Mensaje específico si me quedé sin cuota de API.
        return res.status(402).json({
          message:
            "Spoonacular API daily request limit reached. Try again tomorrow.",
        });
      }
      if (error.response.status === 404 && error.response.data.message) {
        // Si Spoonacular da un 404 pero con un mensaje claro, lo paso.
        return res.status(404).json({ message: error.response.data.message });
      }
    } else if (error.request) {
      // Si hice la petición pero no obtuve respuesta
      console.error("  No response received from Spoonacular server.");
      console.error("  Request:", error.request);
    } else {
      // Cualquier otro tipo de error inesperado en mi código.
      console.error("  Error message:", error.message);
    }
    res.status(500).json({
      message: "Internal server error getting search results from Spoonacular.",
    });
  }
});

// Finalmente, inicio mi servidor y lo pongo a escuchar en el puerto definido.
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
