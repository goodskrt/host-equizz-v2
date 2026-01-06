const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false, // true pour 465, false pour autres ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendQuizNotification(students, quiz, course) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const student of students) {
      try {
        await this.sendQuizEmail(student, quiz, course);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          student: `${student.firstName} ${student.lastName}`,
          email: student.email,
          error: error.message
        });
      }
    }

    return results;
  }

  async sendQuizEmail(student, quiz, course) {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: student.email,
      subject: `📝 Nouveau Quiz Disponible - ${quiz.title}`,
      html: this.generateQuizEmailTemplate(student, quiz, course)
    };

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email envoyé à ${student.email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  }

  async sendManualEmail(recipients, subject, message, quiz = null, course = null) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const recipient of recipients) {
      try {
        await this.sendCustomEmail(recipient, subject, message, quiz, course);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          recipient: recipient.email,
          error: error.message
        });
      }
    }

    return results;
  }

  async sendCustomEmail(recipient, subject, message, quiz = null, course = null) {
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: recipient.email,
      subject: subject,
      html: this.generateCustomEmailTemplate(recipient, subject, message, quiz, course)
    };

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email manuel envoyé à ${recipient.email}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  }

  generateQuizEmailTemplate(student, quiz, course) {
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .quiz-info { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .quiz-details { background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .icon { font-size: 24px; margin-right: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1><span class="icon">📝</span>Nouveau Quiz Disponible</h1>
            <p>EQuizz - Institut Saint Jean</p>
          </div>
          <div class="content">
            <p>Bonjour <strong>${student.firstName} ${student.lastName}</strong>,</p>
            
            <p>Un nouveau quiz vient d'être publié et est maintenant disponible pour votre classe.</p>
            
            <div class="quiz-info">
              <h2 style="color: #667eea; margin-top: 0;">📋 ${quiz.title}</h2>
              ${quiz.description ? `<p><em>${quiz.description}</em></p>` : ''}
              
              <div class="quiz-details">
                <p><strong>📚 Cours :</strong> ${course ? course.name : 'Non spécifié'}</p>
                <p><strong>📅 Disponible du :</strong> ${formatDate(quiz.startDate)}</p>
                <p><strong>⏰ Jusqu'au :</strong> ${formatDate(quiz.endDate)}</p>
                <p><strong>❓ Questions :</strong> ${quiz.questionCount || quiz.questions?.length || 'Non spécifié'}</p>
                <p><strong>🎯 Type :</strong> ${quiz.type === 'MI_PARCOURS' ? 'Évaluation Mi-parcours' : 'Évaluation Finale'}</p>
              </div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Important :</strong>
              <ul>
                <li>Vous devez répondre au quiz avant la date limite</li>
                <li>Une seule tentative est autorisée</li>
                <li>Assurez-vous d'avoir une connexion internet stable</li>
                <li>Lisez attentivement chaque question avant de répondre</li>
              </ul>
            </div>
            
            <div style="text-align: center;">
              <a href="#" class="cta-button">🚀 Accéder au Quiz</a>
            </div>
            
            <p>Connectez-vous à la plateforme EQuizz pour commencer le quiz.</p>
            
            <p>Bonne chance !<br>
            L'équipe EQuizz<br>
            Institut Saint Jean</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement suite à la publication d'un quiz.</p>
            <p>Si vous avez des questions, contactez votre enseignant.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateCustomEmailTemplate(recipient, subject, message, quiz = null, course = null) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 12px 12px; }
          .message-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 ${subject}</h1>
            <p>EQuizz - Institut Saint Jean</p>
          </div>
          <div class="content">
            <p>Bonjour,</p>
            
            <div class="message-box">
              ${message.replace(/\n/g, '<br>')}
            </div>
            
            ${quiz ? `
              <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p><strong>📝 Quiz concerné :</strong> ${quiz.title}</p>
                ${course ? `<p><strong>📚 Cours :</strong> ${course.name}</p>` : ''}
              </div>
            ` : ''}
            
            <p>Cordialement,<br>
            L'équipe EQuizz<br>
            Institut Saint Jean</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé depuis la plateforme EQuizz.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Méthode pour tester la connexion SMTP
  async testConnection() {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      await transporter.verify();
      console.log('✅ Connexion SMTP établie avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur de connexion SMTP:', error);
      return false;
    }
  }
}

module.exports = new EmailService();