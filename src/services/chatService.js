import axios from 'axios';

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

/**
 * Autentica con el backend usando la contraseña global
 */
export async function login(password) {
  try {
    const response = await axios.post(`${backendUrl}/api/login`, { password }, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data.token;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new Error("Contraseña incorrecta");
    }
    throw new Error("Error al conectar con el servidor");
  }
}

/**
 * Envia el mensaje al backend proxy de chat
 * @param {string} message - El mensaje del usuario
 * @param {Array} history - Historial de chat en formato [{ role: "user" | "model", parts: [{ text: "..." }] }]
 * @param {string} documentsMD - Texto de conocimiento base en Markdown
 * @returns {Promise<string>} - La respuesta del modelo
 */
export async function sendChatMessage(message, history = [], documentsMD = '') {
  try {
    const token = localStorage.getItem('bia_token');
    if (!token) throw new Error("Acceso denegado. Por favor, inicia sesión.");

    const payload = {
      userName: "Usuario", // O el nombre real si lo tienes en el estado
      message: message,
      history: history,
      documentsMD: documentsMD
    };

    const response = await axios.post(`${backendUrl}/api/chat`, payload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    return response.data.reply;
  } catch (error) {
    console.error("Error en chatService:", error);
    
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        throw new Error("Contraseña incorrecta (Acceso denegado).");
      } else if (status === 400) {
        throw new Error("Faltan variables en el JSON enviado.");
      } else if (status === 500) {
        throw new Error("Error interno del servidor o de la API de Google.");
      }
      throw new Error(error.response.data.error || "Error de red o de servidor desconocido.");
    } else {
      throw new Error("Error de red. No se pudo contactar al servidor.");
    }
  }
}
