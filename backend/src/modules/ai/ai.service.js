const Project = require('../project/project.model');
const Organization = require('../organization/organization.model');
const { GoogleGenAI } = require('@google/genai');

// Initialize Google Gen AI client if API key is provided
const apiKey = process.env.GEMINI_API_KEY;
let ai = null;

if (apiKey && apiKey.trim() !== '') {
  try {
    ai = new GoogleGenAI({ apiKey });
    console.log('Gemini API initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Gemini API:', error);
  }
} else {
  console.warn('GEMINI_API_KEY is not defined. Falling back to static heuristic algorithms.');
}

// AI Recommendations based on Org Data
exports.generateRecommendations = async (orgId, stats) => {
  // If Gemini client is not initialized, fallback to heuristics
  if (!ai) {
    return runHeuristicRecommendations(orgId, stats);
  }

  try {
    const org = await Organization.findById(orgId);
    const projects = await Project.find({ orgId, isActive: true }).select('title description status priority type updatedAt');

    const prompt = `
You are a senior product manager and data analyst AI advisor for a multi-tenant project management SaaS.
Analyze the following organization metrics and active projects to generate 3-5 high-value, actionable recommendations for the dashboard.

Organization:
- Name: ${org ? org.name : 'Unknown'}
- Subscription Plan: ${org ? org.subscriptionPlan : 'FREE'}

Metrics:
- Total Projects (including inactive): ${stats.totalProjects}
- Active Projects: ${stats.activeProjects}
- Inactive Projects: ${stats.inactiveProjects}

Active Projects Details:
${JSON.stringify(projects, null, 2)}

Provide recommendations of types:
- WARNING: For stalled, inactive, or critical risk items (e.g. untouched projects, high priority bugs stale).
- CLEANUP: For clutter (e.g. too many TODOs, completed projects needing archiving).
- SUCCESS: Celebrate achievements (e.g. high project completion rate).
- UPGRADE: If they are on FREE plan and nearing project limits (free limit is 5 projects).
- ENGAGEMENT: Encourage user action (e.g. no projects active).
- INFO: Helpful organizational tips.
`;

    const schema = {
      type: "OBJECT",
      properties: {
        recommendations: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              type: {
                type: "STRING",
                enum: ["WARNING", "CLEANUP", "SUCCESS", "UPGRADE", "ENGAGEMENT", "INFO"]
              },
              text: {
                type: "STRING",
                description: "Clean, professional recommendation message under 120 characters."
              }
            },
            required: ["type", "text"]
          }
        }
      },
      required: ["recommendations"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = JSON.parse(response.text);
    return result.recommendations || [];
  } catch (error) {
    console.error('Error generating recommendations via Gemini:', error);
    return runHeuristicRecommendations(orgId, stats);
  }
};

// Fallback recommendation engine
async function runHeuristicRecommendations(orgId, stats) {
  const recommendations = [];
  const org = await Organization.findById(orgId);
  const projects = await Project.find({ orgId, isActive: true });

  const now = new Date();

  // Find oldest untouched project
  const untouched = projects.filter(p => {
    const daysSinceUpdate = (now - new Date(p.updatedAt)) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate > 5 && p.status !== 'DONE';
  }).sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));

  if (untouched.length > 0) {
    const p = untouched[0];
    const days = Math.floor((now - new Date(p.updatedAt)) / (1000 * 60 * 60 * 24));
    recommendations.push({
      type: 'WARNING',
      text: `Project "${p.title}" has been inactive for ${days} days. Consider following up.`,
    });
  }

  // Find projects stuck in TODO
  const todos = projects.filter(p => p.status === 'TODO');
  if (todos.length >= 3) {
    recommendations.push({
      type: 'CLEANUP',
      text: `You have ${todos.length} projects stuck in "To Do". Consider moving some to "In Progress".`,
    });
  }

  // Completion rate insight
  const done = projects.filter(p => p.status === 'DONE');
  if (projects.length > 0) {
    const doneRatio = done.length / projects.length;
    if (doneRatio >= 0.5) {
      recommendations.push({
        type: 'SUCCESS',
        text: `Great progress! ${Math.round(doneRatio * 100)}% of your active projects are marked as Done.`,
      });
    }
  }

  // Analyze limits
  if (org && org.subscriptionPlan === 'FREE' && projects.length >= 4) {
    recommendations.push({
      type: 'UPGRADE',
      text: `You are nearing the free tier limits (${projects.length}/5 projects). Upgrade to PRO for unlimited access.`,
    });
  }

  if (projects.length === 0) {
    recommendations.push({
      type: 'ENGAGEMENT',
      text: 'Your organization currently has no active projects. Create a new project to get started!',
    });
  }

  return recommendations;
}

// AI-powered Natural Language Query parsing
exports.parseNaturalLanguageQuery = async (queryText) => {
  if (!ai) {
    return runHeuristicNLP(queryText);
  }

  try {
    const prompt = `
Analyze the user's natural language search query for project management and extract search parameters.
User Query: "${queryText}"

The fields we support are:
- status: "TODO", "IN_PROGRESS", "DONE", or "ANY" (default)
- priority: "Low", "Medium", "High", "Critical", or "ANY" (default)
- type: "Bug", "Feature", "Tech Debt", or "ANY" (default)
- isActive: "ACTIVE" (default), "INACTIVE", or "ANY"
- searchKeyword: Any string search text, or "" (default)
- updatedAtRange: "ANY" (default), "LAST_7_DAYS", "LAST_30_DAYS", "STALE_OVER_30_DAYS"
`;

    const schema = {
      type: "OBJECT",
      properties: {
        status: { type: "STRING", enum: ["TODO", "IN_PROGRESS", "DONE", "ANY"] },
        priority: { type: "STRING", enum: ["Low", "Medium", "High", "Critical", "ANY"] },
        type: { type: "STRING", enum: ["Bug", "Feature", "Tech Debt", "ANY"] },
        isActive: { type: "STRING", enum: ["ACTIVE", "INACTIVE", "ANY"] },
        searchKeyword: { type: "STRING" },
        updatedAtRange: { type: "STRING", enum: ["ANY", "LAST_7_DAYS", "LAST_30_DAYS", "STALE_OVER_30_DAYS"] }
      },
      required: ["status", "priority", "type", "isActive", "searchKeyword", "updatedAtRange"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const params = JSON.parse(response.text);
    
    // Compile parameters into Mongoose query filter object programmatically
    const filter = {};

    if (params.status && params.status !== 'ANY') {
      filter.status = params.status;
    }
    if (params.priority && params.priority !== 'ANY') {
      filter.priority = params.priority;
    }
    if (params.type && params.type !== 'ANY') {
      filter.type = params.type;
    }
    if (params.isActive && params.isActive !== 'ANY') {
      filter.isActive = (params.isActive === 'ACTIVE');
    }
    if (params.searchKeyword && params.searchKeyword.trim() !== '') {
      filter.$or = [
        { title: { $regex: params.searchKeyword, $options: 'i' } },
        { description: { $regex: params.searchKeyword, $options: 'i' } }
      ];
    }
    if (params.updatedAtRange && params.updatedAtRange !== 'ANY') {
      const now = new Date();
      if (params.updatedAtRange === 'LAST_7_DAYS') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        filter.updatedAt = { $gte: sevenDaysAgo };
      } else if (params.updatedAtRange === 'LAST_30_DAYS') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filter.updatedAt = { $gte: thirtyDaysAgo };
      } else if (params.updatedAtRange === 'STALE_OVER_30_DAYS') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        filter.updatedAt = { $lt: thirtyDaysAgo };
      }
    }

    return filter;
  } catch (error) {
    console.error('Error parsing NL query via Gemini:', error);
    return runHeuristicNLP(queryText);
  }
};

// Heuristic fallback for NLP parsing
function runHeuristicNLP(queryText) {
  const q = queryText.toLowerCase();
  const filter = {};

  if (q.includes('inactive') || q.includes('deleted') || q.includes('archived')) {
    filter.isActive = false;
  } else if (q.includes('active') || q.includes('current')) {
    filter.isActive = true;
  }

  if (q.includes('high risk') || q.includes('risky')) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filter.updatedAt = { $lte: thirtyDaysAgo };
  } else if (q.includes('healthy') || q.includes('low risk')) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    filter.updatedAt = { $gt: sevenDaysAgo };
  }

  return filter;
}

// Evaluate project scores in memory (Fast calculation, no network latency)
exports.evaluateProjectInsights = (project) => {
  if (!project) return null;

  const now = new Date();
  const timeSinceUpdate = now - new Date(project.updatedAt);
  const daysSinceUpdate = timeSinceUpdate / (1000 * 60 * 60 * 24);

  let activityScore = 100;
  let riskScore = 0;

  if (daysSinceUpdate > 30) {
    activityScore = 20;
    riskScore = 80;
  } else if (daysSinceUpdate > 7) {
    activityScore = 60;
    riskScore = 40;
  } else {
    activityScore = 95;
    riskScore = 5;
  }

  return {
    ...project,
    activityScore,
    riskScore
  };
};

// AI Issue Triage
exports.triageIssue = async (description) => {
  if (!description) return { priority: 'Medium', type: 'Feature', reasoning: 'No description provided.' };

  if (!ai) {
    return runHeuristicTriage(description);
  }

  try {
    const prompt = `
Analyze the following description of a project issue or task. Classify its type, determine its appropriate priority, and provide a 1-sentence reasoning.

Description:
"${description}"
`;

    const schema = {
      type: "OBJECT",
      properties: {
        priority: {
          type: "STRING",
          enum: ["Low", "Medium", "High", "Critical"]
        },
        type: {
          type: "STRING",
          enum: ["Bug", "Feature", "Tech Debt"]
        },
        reasoning: {
          type: "STRING",
          description: "1-sentence reasoning behind classification."
        }
      },
      required: ["priority", "type", "reasoning"]
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error('Error triaging issue via Gemini:', error);
    return runHeuristicTriage(description);
  }
};

// Fallback heuristic triage
function runHeuristicTriage(description) {
  const text = description.toLowerCase();
  
  let priority = 'Medium';
  let type = 'Feature';

  if (text.includes('crash') || text.includes('bug') || text.includes('error') || text.includes('fail') || text.includes('broken')) {
    type = 'Bug';
  } else if (text.includes('refactor') || text.includes('clean up') || text.includes('debt') || text.includes('optimize')) {
    type = 'Tech Debt';
  }

  if (text.includes('critical') || text.includes('urgent') || text.includes('asap') || text.includes('production down') || text.includes('crash')) {
    priority = 'Critical';
  } else if (text.includes('high') || text.includes('important') || text.includes('soon')) {
    priority = 'High';
  } else if (text.includes('low') || text.includes('minor') || text.includes('whenever')) {
    priority = 'Low';
  }

  return { priority, type, reasoning: 'Classified using fallback keyword rules.' };
}
