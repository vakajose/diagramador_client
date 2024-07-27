const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
//referencia a la base de datos
const pool = require('../database');
const { isLoggedIn } = require('../lib/auth');
const fs = require('fs');
const path = require('path'); // Importa el módulo 'path' para manejar rutas
const xml2js = require('xml2js');
const {HOST_WEB} = require("../config");

const openai = require("openai");
const { Configuration, OpenAIApi } = openai;

const {API_KEY_OPENIA } = require("../config");

router.get('/add', isLoggedIn, (req, res) => {
    //renderizar
    res.render('salas/add');
});

router.post('/add', isLoggedIn, async (req, res) => {
    const { title, xml, description } = req.body;
    const newSalas = {
        title,
        xml,
        description,
        user_id: req.user.id
    };
    const token = jwt.sign({ newSalas }, 'token_sala');
    console.log(token);
    newSalas.tokenS = token;
    const sala = await pool.query('INSERT INTO salas set ?', [newSalas]);
    console.log(sala);
    newSalas.id = sala.insertId;
    console.log(newSalas.id);
    const newUS = {
        user_id: req.user.id,
        salas_id: newSalas.id
    };
    await pool.query('INSERT INTO usersalas set ?', [newUS]);
    //mensajes nombre del mensaje
    req.flash('success', 'Salas guardada Successfully');
    res.redirect('/salas');
    // res.send('recibido');
});

router.get('/', isLoggedIn, async (req, res) => {
    const salas = await pool.query('SELECT * FROM salas where user_id = ?', [req.user.id]);
    res.render('salas/list', { salas });
});

router.get('/salasCompartidas', isLoggedIn, async (req, res) => {
    const idUs = req.user.id;
    console.log(idUs + 'id usuario');
    const salas = await pool.query('SELECT * from salas where id in ( SELECT usersalas.salas_id from usersalas where user_id = ?)', [req.user.id]);
    console.log(salas);
    res.render('salas/listCompartidas', { salas });
});

router.get('/delete/:id', async (req, res) => {
    console.log(req.params.id);
    const { id } = req.params;
    //agregar seguridad al eliminar
    await pool.query('DELETE FROM usersalas WHERE salas_id = ?', [id]);
    await pool.query('DELETE FROM salas WHERE ID = ?', [id]);
    req.flash('success', 'Sala eliminada de la base de datos');
    res.redirect('/salas');
});

router.get('/edit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const salas = await pool.query('SELECT * FROM salas WHERE id = ?', [id]);
    console.log(salas);
    res.render('salas/edit', { sala: salas[0] });
});

router.post('/edit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const { title, description, xml } = req.body;
    const newSala = {
        title,
        description,
        xml
    };
    await pool.query('UPDATE salas set ? WHERE id = ?', [newSala, id]);
    req.flash('success', 'Sala actualizada Successfully');
    res.redirect('/salas');
});

router.get('/inSala/:tokenS', isLoggedIn, async (req, res) => {
    const tokenU = req.user.tokenU;
    console.log(tokenU + 'token de usuario');
    const { tokenS } = req.params;
    console.log(req.params + ' requ parametros');
    const inSala = '?room=' + tokenS;
    const inUs = '&username=' + tokenU;
    const xml = HOST_WEB + '/model-c4' + inSala + inUs;
    console.log("xml: " + xml);
    res.redirect(xml);
});

router.get('/listUsuarios/:idSala', isLoggedIn, async (req, res, idS) => {
    const { idSala } = req.params;

    const users = await pool.query('SELECT * FROM users');
    console.log(users);
    console.log(idSala + 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    idS = idSala;
    res.render('salas/listUsuarios', { users, idSala });
});


router.post('/compartir/:idSala', isLoggedIn, async (req, res,) => {
    console.log('hola');
    console.log(req.body);
    const { idUsuario } = req.body;
    const { idSala } = req.params;

    console.log(idUsuario + 'id del usuario');
    console.log(idSala + ' id de las sala');
    const newUS = {
        user_id: idUsuario,
        salas_id: idSala
    };
    console.log('newUS');
    await pool.query('INSERT INTO usersalas set ?', [newUS]);
    req.flash('success', 'Compartido Successfully');
    res.redirect('/salas');
});

   
router.get('/exportar/:id', isLoggedIn, async (req, res) => {
    try {
        const { id } = req.params;
        const salas = await pool.query('SELECT * FROM salas WHERE id = ?', [id]);
        // Obtiene el contenido XML de 'salas[0].xml'
        const xmlContent = salas[0].xml;

        const javaCode = await convertXmlToJava(xmlContent);
        console.log('Codigo Java :'+ javaCode);
        const [pythonCode, typescriptCode] = await Promise.all([
            convertCodeToPython(javaCode),
            convertCodeToTypescript(javaCode)
        ]);

        res.render('salas/exportar', { javaCode,pythonCode,typescriptCode, sala: salas[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error interno del servidor');
    }
});

async function convertCodeToPython(code) {
    return await generateResponse2("Solo debes convertir el codigo Java a Codigo Python", code);
}
async function convertCodeToRuby(code) {
    return await generateResponse2("Solo debes convertir el codigo Java a Codigo Ruby", code);
}
async function convertCodeToTypescript(code) {
    return await generateResponse2("Solo debes convertir el codigo Java a Codigo Typescript", code);
}
async function generateResponse2(rolePrompt,prompt) {
    // Configura la API con tu clave de API de OpenAI
    const configuration = new Configuration({
        apiKey: API_KEY_OPENIA,
        isInsecureConnection: true,
    });
    const openai = new OpenAIApi(configuration);

    try {
        // Crea una solicitud para generar una respuesta del modelo
        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: rolePrompt }, { role: "user", content: prompt }],
            max_tokens: 2048, // Límite de tokens para la respuesta (ajústalo según tus necesidades),

        });

        // Obtiene la respuesta generada
        const response = completion.data.choices[0].message.content;

        return response;
    } catch (error) {
        console.error("Error al generar la respuesta:", error);
        return "Lo siento, ha ocurrido un error al procesar tu solicitud.";
    }
}
async function convertXmlToJava(xml) {
    return await generateResponse(xml);
}

async function generateResponse(prompt) {
    // Configura la API con tu clave de API de OpenAI
    const configuration = new Configuration({
        apiKey: API_KEY_OPENIA,
        isInsecureConnection: true,
    });
    const openai = new OpenAIApi(configuration);

    try {
        // Crea una solicitud para generar una respuesta del modelo
        const completion = await openai.createChatCompletion({
            model: "ft:gpt-3.5-turbo-1106:personal:xmltojava:9pNMCEDJ",
            messages: [{ role: "system", content: "Debes  converitr y devolver el codigo java solamente" }, { role: "user", content: prompt }],
            max_tokens: 2048, // Límite de tokens para la respuesta (ajústalo según tus necesidades),
            //stop: "END***"
        });

        // Obtiene la respuesta generada
        const response = completion.data.choices[0].message.content;

        return response;
    } catch (error) {
        console.error("Error al generar la respuesta:", error);
        return "Lo siento, ha ocurrido un error al procesar tu solicitud.";
    }
}

      function convertJsonToRuby(json) {
        // Convertir el JSON a un objeto JavaScript.
        const jsonObject = JSON.parse(json);

        // Generar el código Ruby.
        let rubyCode = '';
        for (const key in jsonObject) {
          if (jsonObject.hasOwnProperty(key)) {
            const value = jsonObject[key];

            if (typeof value === 'object') {
              // Si el valor es un objeto, recursivamente convertirlo a código Ruby.
              rubyCode += convertJsonToRuby(JSON.stringify(value));
            } else {
              // Si el valor no es un objeto, simplemente agregarlo al código Ruby.
              rubyCode += `${key}: ${value},\n`;
            }
          }
        }

        // Retornar el código Ruby generado.
        return rubyCode;
      }



      function jsonToPhpCode(json) {
        // Obtener la raíz del modelo mxGraph
        const root = json.mxGraphModel.root;

        // Crear una cadena de código PHP
        let phpCode = `<?php\n\n`;

        // Recorrer los elementos de la raíz
        for (const element of root) {
          // Obtener el identificador del elemento
          const id = element.mxCell[0].$;

          // Obtener el valor del elemento
          const value = element.mxCell[0].$.value;

          // Obtener el estilo del elemento
          const style = element.mxCell[0].$.style;

          // Crear una clase PHP para el elemento
          phpCode += `class ${id} {\n`;

          // Agregar las propiedades del elemento a la clase
          phpCode += `  public $value = '${value}';\n`;
          phpCode += `  public $style = '${style}';\n`;

          // Cerrar la clase
          phpCode += `}\n\n`;
        }

        // Agregar una función para crear una instancia del elemento
        phpCode += `function create${id}() {\n`;
        phpCode += `  return new ${id}();\n`;
        phpCode += `}\n\n`;

        // Cerrar el archivo PHP
        phpCode += `?>`;

        // Devolver el código PHP
        return phpCode;
      }

module.exports = router;
