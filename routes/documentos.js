const express = require('express');
const multer = require('multer');
const { Octokit } = require('@octokit/rest');
const router = express.Router();

// Configuración de GitHub
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Token que configurarás
});

const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'tu-usuario';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'club-sarmiento-docs';

// Configuración de multer para archivos temporales
const upload = multer({
  dest: 'temp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  }
});

// Subir documento a GitHub
router.post('/upload', upload.single('documento'), async (req, res) => {
  try {
    const { categoria, mes, año, descripcion } = req.body;
    const file = req.file;
    
    console.log('📁 Datos recibidos:', { categoria, mes, año, descripcion });
    console.log('📄 Archivo:', file ? file.originalname : 'No file');
    
    if (!file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    // Leer el archivo
    const fs = require('fs');
    const fileContent = fs.readFileSync(file.path);
    const base64Content = fileContent.toString('base64');

    // Crear nombre único para el archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const añoFinal = parseInt(año) || new Date().getFullYear();
    const mesFinal = parseInt(mes) || new Date().getMonth() + 1;
    const fileName = `${añoFinal}/${mesFinal.toString().padStart(2, '0')}/${timestamp}_${file.originalname}`;

    // Subir a GitHub
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: fileName,
      message: `Subir documento: ${file.originalname}`,
      content: base64Content,
      branch: 'main'
    });

    // Limpiar archivo temporal
    fs.unlinkSync(file.path);

    // Crear URL de descarga permanente (sin token)
    const downloadUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${fileName}`;

    // Guardar metadatos en la base de datos local
    const db = require('../db_sqlite');
    const result = await db.query(`
      INSERT INTO documentos (nombre, categoria, fecha_subida, mes, año, tamaño, tipo_archivo, url_github, sha, descripcion, usuario_subida)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      file.originalname,
      categoria,
      new Date().toISOString(),
      mesFinal,
      añoFinal,
      `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      file.mimetype.split('/')[1] || 'unknown',
      downloadUrl,
      response.data.content.sha,
      descripcion || '',
      req.user?.username || 'admin'
    ]);

    res.json({
      success: true,
      message: 'Documento subido exitosamente',
      data: {
        id: result.rows[0].id,
        nombre: file.originalname,
        url: downloadUrl,
        sha: response.data.content.sha
      }
    });

  } catch (error) {
    console.error('Error subiendo documento:', error);
    res.status(500).json({ 
      error: 'Error subiendo documento',
      details: error.message 
    });
  }
});

// Listar documentos
router.get('/', async (req, res) => {
  try {
    const { mes, año, categoria, search } = req.query;
    
    const db = require('../db_sqlite');
    let query = 'SELECT * FROM documentos WHERE 1=1';
    const params = [];

    if (mes && mes !== 'todos') {
      query += ' AND mes = ?';
      params.push(parseInt(mes));
    }

    if (año) {
      query += ' AND año = ?';
      params.push(parseInt(año));
    }

    if (categoria && categoria !== 'todos') {
      query += ' AND categoria = ?';
      params.push(categoria);
    }

    if (search) {
      query += ' AND nombre LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY fecha_subida DESC';

    const result = await db.query(query, params);
    const documentos = result.rows;
    
    res.json({
      success: true,
      data: documentos
    });

  } catch (error) {
    console.error('Error listando documentos:', error);
    res.status(500).json({ 
      error: 'Error obteniendo documentos',
      details: error.message 
    });
  }
});

// Descargar documento
router.get('/download/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const db = require('../db_sqlite');
    const result = await db.query('SELECT * FROM documentos WHERE id = ?', [id]);
    const documento = result.rows[0];
    
    if (!documento) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    // Intentar obtener el archivo desde GitHub
    let githubResponse;
    try {
      githubResponse = await fetch(documento.url_github);
      
      if (githubResponse.ok) {
        // Configurar headers para forzar descarga
        res.setHeader('Content-Disposition', `attachment; filename="${documento.nombre}"`);
        res.setHeader('Content-Type', githubResponse.headers.get('content-type') || 'application/octet-stream');
        
        // Stream del archivo desde GitHub
        githubResponse.body.pipe(res);
        return;
      } else {
        console.warn(`GitHub devolvió ${githubResponse.status} para documento ${id}, intentando reconstruir URL...`);
      }
    } catch (githubError) {
      console.warn('Error obteniendo archivo desde GitHub:', githubError.message);
    }

    // Si la URL original falla, intentar reconstruir la URL permanente
    try {
      // Reconstruir URL usando el formato estándar: año/mes/nombre_archivo
      const mesFormateado = documento.mes.toString().padStart(2, '0');
      const rutaReconstruida = `${documento.año}/${mesFormateado}/`;
      
      // Buscar el archivo en GitHub usando la API para encontrar el nombre exacto
      const filesResponse = await octokit.rest.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: rutaReconstruida,
        ref: 'main'
      });

      // Buscar archivo que coincida con el nombre (puede tener timestamp)
      if (Array.isArray(filesResponse.data)) {
        const archivoEncontrado = filesResponse.data.find(file => 
          file.name.includes(documento.nombre) || documento.nombre.includes(file.name)
        );

        if (archivoEncontrado && archivoEncontrado.type === 'file') {
          // Construir URL permanente
          const nuevaUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${archivoEncontrado.path}`;
          
          // Intentar descargar con la nueva URL
          githubResponse = await fetch(nuevaUrl);
          
          if (githubResponse.ok) {
            // Actualizar URL en la base de datos
            await db.query('UPDATE documentos SET url_github = ? WHERE id = ?', [nuevaUrl, id]);
            
            // Configurar headers para forzar descarga
            res.setHeader('Content-Disposition', `attachment; filename="${documento.nombre}"`);
            res.setHeader('Content-Type', githubResponse.headers.get('content-type') || 'application/octet-stream');
            
            // Stream del archivo desde GitHub
            githubResponse.body.pipe(res);
            return;
          }
        }
      }
    } catch (reconstructError) {
      console.warn('Error reconstruyendo URL:', reconstructError.message);
    }

    // Si GitHub falla, devolver error informativo
    res.status(404).json({ 
      error: 'Archivo no disponible',
      message: 'El archivo no se encuentra disponible en GitHub. Puede que haya sido eliminado o el token haya expirado.',
      suggestion: 'Intenta subir el archivo nuevamente.',
      documento: {
        id: documento.id,
        nombre: documento.nombre,
        fecha_subida: documento.fecha_subida
      }
    });

  } catch (error) {
    console.error('Error descargando documento:', error);
    res.status(500).json({ 
      error: 'Error descargando documento',
      details: error.message 
    });
  }
});

// Eliminar documento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Intentando eliminar documento ID:', id);
    
    const db = require('../db_sqlite');
    const result = await db.query('SELECT * FROM documentos WHERE id = ?', [id]);
    const documento = result.rows[0];
    
    if (!documento) {
      console.log('❌ Documento no encontrado en BD');
      return res.status(404).json({ error: 'Documento no encontrado' });
    }

    console.log('📄 Documento encontrado:', documento.nombre);
    console.log('🔗 URL GitHub:', documento.url_github);

    // Extraer path del archivo de la URL de GitHub
    const urlParts = documento.url_github.split('/');
    console.log('🔍 URL parts:', urlParts);
    
    // Buscar el índice de 'main' en la URL
    const mainIndex = urlParts.findIndex(part => part === 'main');
    if (mainIndex === -1) {
      throw new Error('No se encontró "main" en la URL de GitHub');
    }
    
    let filePath = urlParts.slice(mainIndex + 1).join('/');
    
    // Remover parámetros de query (como ?token=...)
    if (filePath.includes('?')) {
      filePath = filePath.split('?')[0];
    }
    
    console.log('📁 File path extraído:', filePath);

    // Eliminar de GitHub
    console.log('🗑️ Eliminando de GitHub...');
    await octokit.rest.repos.deleteFile({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      message: `Eliminar documento: ${documento.nombre}`,
      sha: documento.sha,
      branch: 'main'
    });

    // Eliminar de base de datos local
    console.log('🗑️ Eliminando de BD local...');
    await db.query('DELETE FROM documentos WHERE id = ?', [id]);

    console.log('✅ Documento eliminado exitosamente');
    res.json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error eliminando documento:', error);
    res.status(500).json({ 
      error: 'Error eliminando documento',
      details: error.message 
    });
  }
});

module.exports = router;
