const xlsx = require('xlsx');
const fs = require('fs');
const { Question } = require('../models/Quiz');
const { Course } = require('../models/Academic');

// @desc    Importer des questions depuis Excel
// @route   POST /api/admin/import/questions
exports.importQuestions = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Veuillez uploader un fichier Excel' });
  }

  const { courseId } = req.body;

  try {
    // 1. Vérifier que le cours existe
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Cours introuvable' });
    }

    // 2. Lire le fichier
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convertir en JSON
    // Format attendu Excel: colonnes "Enonce", "Type" (QCM/OUVERT), "Options" (séparées par point-virgule), "Reponse"
    const data = xlsx.utils.sheet_to_json(sheet);

    const questionsToInsert = [];
    const errors = [];

    // 3. Traiter ligne par ligne
    data.forEach((row, index) => {
      try {
        if (!row.Enonce || !row.Type) {
          throw new Error(`Ligne ${index + 2}: Énoncé ou Type manquant`);
        }

        let options = [];
        if (row.Type === 'MCQ' && row.Options) {
          options = row.Options.split(';').map(o => o.trim());
        }

        questionsToInsert.push({
          courseId,
          text: row.Enonce,
          type: row.Type, // Assurez-vous que le Excel contient 'MCQ', 'OPEN' ou 'CLOSED'
          options: options,
          correctAnswer: row.Reponse || null
        });

      } catch (err) {
        errors.push(err.message);
      }
    });

    // 4. Sauvegarder en masse
    if (questionsToInsert.length > 0) {
      await Question.insertMany(questionsToInsert);
    }

    // 5. Supprimer le fichier temporaire
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Import terminé',
      importedCount: questionsToInsert.length,
      errors: errors
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
