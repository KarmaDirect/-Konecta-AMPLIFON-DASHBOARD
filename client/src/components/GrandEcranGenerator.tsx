import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Agent, getEmoji, getTopAgents } from "@/lib/agent";
import { useToast } from "@/hooks/use-toast";

interface GrandEcranGeneratorProps {
  crmAgents: Agent[];
  digitalAgents: Agent[];
}

export function GrandEcranGenerator({ crmAgents, digitalAgents }: GrandEcranGeneratorProps) {
  const { toast } = useToast();

  // Générer le HTML du grand écran
  const handleGrandEcranDownload = () => {
    const allAgents = [...crmAgents, ...digitalAgents.filter(a => 
      !crmAgents.some(ca => ca.id === a.id))
    ];
    
    // Calculer les statistiques
    const crmAgentCount = crmAgents.length;
    const digitalAgentCount = digitalAgents.length;
    
    const totalCRMObjectif = crmAgents.reduce((sum, a) => sum + a.objectif, 0);
    const totalDigitalObjectif = digitalAgents.reduce((sum, a) => sum + a.objectif, 0);
    
    const totalCRMCompleted = crmAgents.reduce((sum, a) => {
      const currentCRM = a.currentCRM || 0;
      const completed = a.objectif - currentCRM;
      return sum + (completed > 0 ? completed : 0);
    }, 0);
    
    const totalDigitalCompleted = digitalAgents.reduce((sum, a) => {
      const currentDigital = a.currentDigital || 0;
      const completed = a.objectif - currentDigital;
      return sum + (completed > 0 ? completed : 0);
    }, 0);
    
    const crmCompletionRate = totalCRMObjectif ? Math.round((totalCRMCompleted / totalCRMObjectif) * 100) : 0;
    const digitalCompletionRate = totalDigitalObjectif ? Math.round((totalDigitalCompleted / totalDigitalObjectif) * 100) : 0;
    
    const topCRMAgents = getTopAgents(crmAgents, "currentCRM", 5);
    const topDigitalAgents = getTopAgents(digitalAgents, "currentDigital", 5);
    
    // Créer le contenu HTML
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>POINT RDV - Grand Écran</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(to bottom right, #1a202c, #2b6cb0);
      color: white;
      margin: 0;
      padding: 20px;
      min-height: 100vh;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .logo {
      background: white;
      padding: 5px;
      border-radius: 5px;
      height: 40px;
    }
    .title {
      text-align: center;
      flex-grow: 1;
    }
    .title h1 {
      font-size: 2.5rem;
      margin: 0;
    }
    .stats-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .stats-card {
      background: rgba(30, 58, 138, 0.5);
      border-radius: 10px;
      padding: 15px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .stats-card h2 {
      font-size: 1.5rem;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 15px;
    }
    .stat-box {
      background: rgba(30, 64, 175, 0.6);
      border-radius: 5px;
      padding: 10px;
    }
    .stat-box p {
      margin: 0;
    }
    .stat-box .value {
      font-size: 1.8rem;
      font-weight: bold;
    }
    .progress-bar {
      height: 24px;
      background: #374151;
      border-radius: 12px;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      transition: width 0.5s;
    }
    .progress-fill.crm {
      background: linear-gradient(to right, #3b82f6, #10b981);
    }
    .progress-fill.digital {
      background: linear-gradient(to right, #8b5cf6, #ec4899);
    }
    .agents-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 30px;
    }
    .agents-section h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(30, 58, 138, 0.5);
      padding: 10px;
      border-radius: 8px;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .color-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: inline-block;
    }
    .color-dot.crm {
      background: #3b82f6;
    }
    .color-dot.digital {
      background: #8b5cf6;
    }
    .agents-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .agent-card {
      background: white;
      color: black;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .agent-card.crm {
      border-left: 4px solid #3b82f6;
    }
    .agent-card.digital {
      border-left: 4px solid #8b5cf6;
    }
    .agent-header {
      padding: 15px 15px 5px;
    }
    .agent-name {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }
    .agent-name h3 {
      margin: 0;
      font-size: 1.2rem;
    }
    .agent-type {
      color: #6b7280;
      font-size: 0.9rem;
    }
    .agent-content {
      padding: 0 15px 15px;
    }
    .agent-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
      margin-bottom: 10px;
      font-size: 0.9rem;
    }
    .agent-stats div {
      display: flex;
      justify-content: space-between;
    }
    .agent-stats .label {
      font-weight: 500;
    }
    .agent-stats .completed {
      color: #059669;
      font-weight: bold;
    }
    .agent-stats .bonus {
      color: #d97706;
      font-weight: bold;
    }
    .agent-progress {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      margin-bottom: 5px;
      overflow: hidden;
    }
    .agent-progress-fill.crm {
      height: 100%;
      background: #3b82f6;
      border-radius: 4px;
      transition: width 0.5s;
    }
    .agent-progress-fill.digital {
      height: 100%;
      background: #8b5cf6;
      border-radius: 4px;
      transition: width 0.5s;
    }
    .agent-progress-text {
      text-align: center;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .footer {
      text-align: center;
      color: #9ca3af;
      margin-top: 20px;
    }
    .objectives {
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 10px;
    }
    .ticker {
      background: linear-gradient(to right, #1e3a8a, #7e22ce);
      border: 2px solid #fcd34d;
      border-radius: 8px;
      padding: 20px 0;
      overflow: hidden;
      margin: 20px 0;
      position: relative;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .ticker-content {
      white-space: nowrap;
      animation: ticker 30s linear infinite;
      display: inline-block;
    }
    .ticker-item {
      display: inline-block;
      margin: 0 50px;
      font-size: 1.5rem;
      font-weight: bold;
    }
    .ticker-item.crm {
      color: #fcd34d;
    }
    .ticker-item.digital {
      color: #f9a8d4;
    }
    @keyframes ticker {
      0% { transform: translateX(100%); }
      100% { transform: translateX(-100%); }
    }
    @media (max-width: 768px) {
      .stats-container, .agents-container {
        grid-template-columns: 1fr;
      }
      .agents-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://upload.wikimedia.org/wikipedia/fr/thumb/e/e7/Konecta_Logo_2021.svg/512px-Konecta_Logo_2021.svg.png" alt="Konecta" class="logo">
    <div class="title">
      <h1>🎯 POINT RDV</h1>
      <p style="font-size: 1rem; color: #9ca3af; margin: 0;">by hatim</p>
      <p style="font-size: 1.2rem; opacity: 0.7; margin: 5px 0;">Grand Écran</p>
      <p>Mise à jour: ${new Date().toLocaleTimeString()}</p>
    </div>
    <img src="/attached_assets/Amplifon-Logo.png" alt="Amplifon" class="logo">
  </div>

  <div class="stats-container">
    <div class="stats-card">
      <h2>📋 Campagne CRM</h2>
      <div class="stats-grid">
        <div class="stat-box">
          <p>Total Agents</p>
          <p class="value">${crmAgentCount}</p>
        </div>
        <div class="stat-box">
          <p>RDV Totaux</p>
          <p class="value">${totalCRMObjectif}</p>
        </div>
        <div class="stat-box">
          <p>RDV Réalisés</p>
          <p class="value">${totalCRMCompleted}</p>
        </div>
        <div class="stat-box">
          <p>RDV Bonus</p>
          <p class="value">${crmAgents.reduce((sum, a) => {
            const currentCRM = a.currentCRM || 0;
            return sum + (currentCRM < 0 ? Math.abs(currentCRM) : 0);
          }, 0)} ⭐</p>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill crm" style="width: ${crmCompletionRate}%">${crmCompletionRate}%</div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
        <span>Progression: ${totalCRMCompleted}/${totalCRMObjectif}</span>
        <span>${crmCompletionRate}%</span>
      </div>
      <div style="text-align: center; margin-top: 10px;">
        <div style="font-weight: bold; color: #fcd34d;">
          ${totalCRMObjectif - totalCRMCompleted} RDV restants
        </div>
      </div>
    </div>

    <div class="stats-card">
      <h2>💻 Campagne Digitale</h2>
      <div class="stats-grid">
        <div class="stat-box">
          <p>Total Agents</p>
          <p class="value">${digitalAgentCount}</p>
        </div>
        <div class="stat-box">
          <p>RDV Totaux</p>
          <p class="value">${totalDigitalObjectif}</p>
        </div>
        <div class="stat-box">
          <p>RDV Réalisés</p>
          <p class="value">${totalDigitalCompleted}</p>
        </div>
        <div class="stat-box">
          <p>RDV Bonus</p>
          <p class="value">${digitalAgents.reduce((sum, a) => {
            const currentDigital = a.currentDigital || 0;
            return sum + (currentDigital < 0 ? Math.abs(currentDigital) : 0);
          }, 0)} ⭐</p>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill digital" style="width: ${digitalCompletionRate}%">${digitalCompletionRate}%</div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
        <span>Progression: ${totalDigitalCompleted}/${totalDigitalObjectif}</span>
        <span>${digitalCompletionRate}%</span>
      </div>
      <div style="text-align: center; margin-top: 10px;">
        <div style="font-weight: bold; color: #fcd34d;">
          ${totalDigitalObjectif - totalDigitalCompleted} RDV restants
        </div>
      </div>
    </div>
  </div>

  <div class="ticker">
    <div class="ticker-content">
      ${topCRMAgents.map(agent => {
        const count = agent.currentCRM || 0;
        const name = agent.name;
        const bonus = count < 0 ? Math.abs(count) : 0;
        const isBelowObjectif = count > 0;
        
        return `<span class="ticker-item crm">
          ${isBelowObjectif 
            ? `Allez ${name}! Plus que ${count} RDV pour atteindre l'objectif! 💪` 
            : `Félicitations ${name} pour tes ${bonus} RDV supplémentaires! 🏆`}
        </span>`;
      }).join('')}
      
      ${topDigitalAgents.map(agent => {
        const count = agent.currentDigital || 0;
        const name = agent.name;
        const bonus = count < 0 ? Math.abs(count) : 0;
        const isBelowObjectif = count > 0;
        
        return `<span class="ticker-item digital">
          ${isBelowObjectif 
            ? `Encore un effort ${name}! Tu es presque à ton objectif! 🚀` 
            : `Bravo ${name}, champion(ne) avec ${bonus} RDV bonus! 👑`}
        </span>`;
      }).join('')}
    </div>
  </div>

  <div class="agents-container">
    <div class="agents-section">
      <h2><span class="color-dot crm"></span> Top 5 Agents CRM</h2>
      <div class="agents-grid">
        ${topCRMAgents.map(agent => {
          const value = agent.currentCRM || 0;
          const objectif = agent.objectif;
          const completionRatio = Math.min(Math.max(0, 1 - (value / objectif)), 1);
          const completedRdv = Math.max(0, objectif - value);
          const hasBonus = value < 0;
          
          return `<div class="agent-card crm">
            <div class="agent-header">
              <div class="agent-name">
                <h3>${agent.name}</h3>
                <span>${value <= 0 ? '🏆' : '💪'}</span>
              </div>
              <div class="agent-type">
                Type: ${agent.type} - RDV CRM
              </div>
            </div>
            <div class="agent-content">
              <div class="agent-stats">
                <div>
                  <span class="label">Objectif:</span>
                  <span>${objectif}</span>
                </div>
                <div>
                  <span class="label">Réalisés:</span>
                  <span>${completedRdv}</span>
                </div>
                <div>
                  <span class="label">Restants:</span>
                  <span>${value > 0 ? value : '<span class="completed">Terminé!</span>'}</span>
                </div>
                ${hasBonus ? `<div>
                  <span class="label">Bonus:</span>
                  <span class="bonus">${Math.abs(value)} ⭐</span>
                </div>` : ''}
              </div>
              <div class="agent-progress">
                <div class="agent-progress-fill crm" style="width: ${completionRatio * 100}%"></div>
              </div>
              <div class="agent-progress-text">
                ${Math.round(completionRatio * 100)}% accompli
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="agents-section">
      <h2><span class="color-dot digital"></span> Top 5 Agents Digitaux</h2>
      <div class="agents-grid">
        ${topDigitalAgents.map(agent => {
          const value = agent.currentDigital || 0;
          const objectif = agent.objectif;
          const completionRatio = Math.min(Math.max(0, 1 - (value / objectif)), 1);
          const completedRdv = Math.max(0, objectif - value);
          const hasBonus = value < 0;
          
          return `<div class="agent-card digital">
            <div class="agent-header">
              <div class="agent-name">
                <h3>${agent.name}</h3>
                <span>${value <= 0 ? '🏆' : '💪'}</span>
              </div>
              <div class="agent-type">
                Type: ${agent.type} - RDV Digital
              </div>
            </div>
            <div class="agent-content">
              <div class="agent-stats">
                <div>
                  <span class="label">Objectif:</span>
                  <span>${objectif}</span>
                </div>
                <div>
                  <span class="label">Réalisés:</span>
                  <span>${completedRdv}</span>
                </div>
                <div>
                  <span class="label">Restants:</span>
                  <span>${value > 0 ? value : '<span class="completed">Terminé!</span>'}</span>
                </div>
                ${hasBonus ? `<div>
                  <span class="label">Bonus:</span>
                  <span class="bonus">${Math.abs(value)} ⭐</span>
                </div>` : ''}
              </div>
              <div class="agent-progress">
                <div class="agent-progress-fill digital" style="width: ${completionRatio * 100}%"></div>
              </div>
              <div class="agent-progress-text">
                ${Math.round(completionRatio * 100)}% accompli
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>

  <div class="footer">
    <p class="objectives">
      Objectifs journaliers: HOT = 3/h | PROSPECT = 2/h | DIGI = 5/h
    </p>
    <p>
      POINT RDV - Développé par hatim - version 2.0
    </p>
  </div>

  <script>
    // Rafraîchir la page toutes les minutes
    setTimeout(() => window.location.reload(), 60000);
  </script>
</body>
</html>
    `;
    
    // Créer un blob avec le contenu HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    
    // Créer un lien de téléchargement
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'grand-ecran.html';
    
    // Déclencher le téléchargement
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Grand Écran généré",
      description: "Le fichier HTML du grand écran a été téléchargé. Ouvrez-le pour afficher le grand écran.",
    });
  };

  return (
    <Button 
      variant="secondary"
      onClick={handleGrandEcranDownload}
      className="w-full"
    >
      <Download className="mr-2 h-4 w-4" />
      Télécharger le Grand Écran
    </Button>
  );
}