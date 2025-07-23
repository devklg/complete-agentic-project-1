/**
 * Trinity Framework Backend Server
 * BMAD v4 + PRP + ACI.dev + ShadCN Integration
 * PowerLine System for Magnificent Worldwide
 * Created by: Kevin Gardner
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import winston from 'winston';
import dotenv from 'dotenv';

// Trinity Framework Core Modules
import { BMADv4Engine } from './src/core/bmad-v4-engine.js';
import { PRPMethodology } from './src/core/prp-methodology.js';
import { ACIDevIntegration } from './src/core/aci-dev-integration.js';
import { TrinityOrchestrator } from './src/core/trinity-orchestrator.js';

// PowerLine System Modules
import { PowerLineAPI } from './src/powerline/powerline-api.js';
import { TalkFusionIntegration } from './src/powerline/talk-fusion-integration.js';
import { AgentCoordinator } from './src/agents/agent-coordinator.js';
import { DashboardWebSocket } from './src/dashboard/dashboard-websocket.js';

// Infrastructure
import { DatabaseConnection } from './src/infrastructure/database.js';
import { RedisConnection } from './src/infrastructure/redis.js';
import { Logger } from './src/infrastructure/logger.js';

// Load environment configuration
dotenv.config();

class TrinityBackendServer {
    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: process.env.FRONTEND_URLS?.split(',') || ["http://localhost:3000", "http://localhost:5173"],
                methods: ["GET", "POST", "PUT", "DELETE"],
                credentials: true
            }
        });
        
        this.port = process.env.PORT || 5002; // MARCUS Backend Port
        this.logger = new Logger('TrinityBackend');
        
        // Initialize Trinity Framework components
        this.bmadEngine = new BMADv4Engine();
        this.prpMethodology = new PRPMethodology();
        this.aciIntegration = new ACIDevIntegration();
        this.orchestrator = new TrinityOrchestrator(this.bmadEngine, this.prpMethodology, this.aciIntegration);
        
        // Initialize PowerLine components
        this.powerLineAPI = new PowerLineAPI();
        this.talkFusion = new TalkFusionIntegration();
        this.agentCoordinator = new AgentCoordinator();
        this.dashboardWS = new DashboardWebSocket(this.io);
        
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeWebSocket();
        this.initializeDatabase();
    }

    initializeMiddleware() {
        // Security and performance middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                    scriptSrc: ["'self'", "'unsafe-eval'"] // Required for ShadCN dynamic imports
                }
            }
        }));
        
        this.app.use(compression());
        this.app.use(cors({
            origin: process.env.FRONTEND_URLS?.split(',') || ["http://localhost:3000", "http://localhost:5173"],
            credentials: true
        }));
        
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        
        // Request logging
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`, { 
                ip: req.ip, 
                userAgent: req.get('User-Agent') 
            });
            next();
        });
    }

    initializeRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                framework: 'Trinity Framework - BMAD v4 + PRP + ACI.dev',
                components: {
                    bmadEngine: this.bmadEngine.getStatus(),
                    prpMethodology: this.prpMethodology.getStatus(),
                    aciIntegration: this.aciIntegration.getStatus(),
                    powerLineAPI: this.powerLineAPI.getStatus(),
                    talkFusion: this.talkFusion.getStatus()
                }
            });
        });

        // Trinity Framework endpoints
        this.app.use('/api/trinity', this.createTrinityRoutes());
        
        // PowerLine System endpoints
        this.app.use('/api/powerline', this.createPowerLineRoutes());
        
        // Agent Management endpoints
        this.app.use('/api/agents', this.createAgentRoutes());
        
        // Dashboard endpoints
        this.app.use('/api/dashboard', this.createDashboardRoutes());
        
        // ShadCN Component endpoints
        this.app.use('/api/components', this.createComponentRoutes());
        
        // Talk Fusion Integration endpoints
        this.app.use('/api/talk-fusion', this.createTalkFusionRoutes());
    }

    createTrinityRoutes() {
        const router = express.Router();
        
        // BMAD v4 Engine endpoints
        router.get('/bmad/status', (req, res) => {
            res.json(this.bmadEngine.getDetailedStatus());
        });
        
        router.post('/bmad/deploy', async (req, res) => {
            try {
                const result = await this.bmadEngine.deploy(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // PRP Methodology endpoints
        router.get('/prp/validate', async (req, res) => {
            try {
                const validation = await this.prpMethodology.validateSystem();
                res.json(validation);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        // ACI.dev Integration endpoints
        router.get('/aci/tools', (req, res) => {
            res.json(this.aciIntegration.getAvailableTools());
        });
        
        router.post('/aci/execute', async (req, res) => {
            try {
                const result = await this.aciIntegration.executeTool(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        return router;
    }

    createPowerLineRoutes() {
        const router = express.Router();
        
        // PowerLine core endpoints
        router.get('/status', (req, res) => {
            res.json(this.powerLineAPI.getSystemStatus());
        });
        
        router.get('/tree', async (req, res) => {
            try {
                const tree = await this.powerLineAPI.getPowerLineTree();
                res.json(tree);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        router.post('/enroll', async (req, res) => {
            try {
                const enrollment = await this.powerLineAPI.processEnrollment(req.body);
                res.json(enrollment);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        router.get('/positions', async (req, res) => {
            try {
                const positions = await this.powerLineAPI.getPositions();
                res.json(positions);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        return router;
    }

    createAgentRoutes() {
        const router = express.Router();
        
        router.get('/status', (req, res) => {
            res.json(this.agentCoordinator.getAllAgentStatus());
        });
        
        router.post('/deploy/:agentId', async (req, res) => {
            try {
                const result = await this.agentCoordinator.deployAgent(req.params.agentId);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        router.get('/:agentId/logs', async (req, res) => {
            try {
                const logs = await this.agentCoordinator.getAgentLogs(req.params.agentId);
                res.json(logs);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        return router;
    }

    createDashboardRoutes() {
        const router = express.Router();
        
        router.get('/metrics', async (req, res) => {
            try {
                const metrics = await this.dashboardWS.getSystemMetrics();
                res.json(metrics);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        router.get('/activity', async (req, res) => {
            try {
                const activity = await this.dashboardWS.getRecentActivity();
                res.json(activity);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        return router;
    }

    createComponentRoutes() {
        const router = express.Router();
        
        router.get('/shadcn/list', (req, res) => {
            res.json({
                available: true,
                components: [
                    'accordion', 'alert', 'avatar', 'badge', 'button', 'calendar',
                    'card', 'checkbox', 'collapsible', 'combobox', 'command',
                    'context-menu', 'data-table', 'date-picker', 'dialog',
                    'dropdown-menu', 'form', 'hover-card', 'input', 'label',
                    'menubar', 'navigation-menu', 'popover', 'progress',
                    'radio-group', 'scroll-area', 'select', 'separator', 'sheet',
                    'skeleton', 'slider', 'switch', 'table', 'tabs', 'textarea',
                    'toast', 'toggle', 'tooltip', 'typography'
                ],
                theme: 'powerline-scarlet-gold',
                version: '0.3.0'
            });
        });
        
        return router;
    }

    createTalkFusionRoutes() {
        const router = express.Router();
        
        router.get('/status', (req, res) => {
            res.json(this.talkFusion.getIntegrationStatus());
        });
        
        router.post('/process-payment', async (req, res) => {
            try {
                const result = await this.talkFusion.processPayment(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        router.post('/enroll-member', async (req, res) => {
            try {
                const result = await this.talkFusion.enrollMember(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        
        return router;
    }

    initializeWebSocket() {
        this.io.on('connection', (socket) => {
            this.logger.info(`Client connected: ${socket.id}`);
            
            // Trinity Framework WebSocket events
            socket.on('trinity:subscribe', (data) => {
                this.orchestrator.subscribeToUpdates(socket, data);
            });
            
            // PowerLine real-time events
            socket.on('powerline:subscribe', (data) => {
                this.powerLineAPI.subscribeToUpdates(socket, data);
            });
            
            // Agent monitoring events
            socket.on('agents:monitor', (data) => {
                this.agentCoordinator.startMonitoring(socket, data);
            });
            
            socket.on('disconnect', () => {
                this.logger.info(`Client disconnected: ${socket.id}`);
                this.orchestrator.unsubscribeFromUpdates(socket);
                this.powerLineAPI.unsubscribeFromUpdates(socket);
                this.agentCoordinator.stopMonitoring(socket);
            });
        });
        
        // Start real-time data broadcasting
        this.startRealTimeUpdates();
    }

    async initializeDatabase() {
        try {
            await DatabaseConnection.connect();
            await RedisConnection.connect();
            this.logger.info('Database connections established');
        } catch (error) {
            this.logger.error('Database connection failed:', error);
            process.exit(1);
        }
    }

    startRealTimeUpdates() {
        // Broadcast system status every 5 seconds
        setInterval(() => {
            this.io.emit('system:status', {
                timestamp: new Date().toISOString(),
                trinity: this.orchestrator.getStatus(),
                powerline: this.powerLineAPI.getStatus(),
                agents: this.agentCoordinator.getActiveAgents()
            });
        }, 5000);
        
        // Broadcast PowerLine updates every 3 seconds
        setInterval(async () => {
            try {
                const updates = await this.powerLineAPI.getLatestUpdates();
                if (updates.length > 0) {
                    this.io.emit('powerline:updates', updates);
                }
            } catch (error) {
                this.logger.error('PowerLine updates failed:', error);
            }
        }, 3000);
    }

    async start() {
        try {
            // Initialize Trinity Framework
            await this.orchestrator.initialize();
            
            // Initialize PowerLine components
            await this.powerLineAPI.initialize();
            await this.talkFusion.initialize();
            await this.agentCoordinator.initialize();
            
            this.server.listen(this.port, () => {
                this.logger.info(`🚀 Trinity Backend Server running on port ${this.port}`);
                this.logger.info(`🎯 Framework: BMAD v4 + PRP + ACI.dev`);
                this.logger.info(`⚡ PowerLine System: Active`);
                this.logger.info(`🤖 Agent Coordination: Ready`);
                this.logger.info(`🎨 ShadCN Components: Available`);
                this.logger.info(`💰 Talk Fusion Integration: Connected`);
            });
            
        } catch (error) {
            this.logger.error('Server startup failed:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        this.logger.info('Shutting down Trinity Backend Server...');
        
        this.server.close(() => {
            DatabaseConnection.disconnect();
            RedisConnection.disconnect();
            this.logger.info('Server shutdown complete');
            process.exit(0);
        });
    }
}

// Initialize and start the server
const server = new TrinityBackendServer();

// Graceful shutdown handlers
process.on('SIGTERM', () => server.shutdown());
process.on('SIGINT', () => server.shutdown());

// Start the server
server.start().catch((error) => {
    console.error('Failed to start Trinity Backend Server:', error);
    process.exit(1);
});

export default server;