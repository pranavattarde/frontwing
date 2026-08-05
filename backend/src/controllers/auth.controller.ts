import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthRequest } from '../types/auth.types';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const result = await AuthService.register({ email, password, name });
      return res.status(201).json(result);
    } catch (err: any) {
      console.error('[AuthController.register] Error:', err.message);
      return res.status(400).json({ error: err.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await AuthService.login({ email, password });
      return res.json(result);
    } catch (err: any) {
      console.error('[AuthController.login] Error:', err.message);
      return res.status(401).json({ error: err.message });
    }
  }

  static async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await AuthService.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user });
    } catch (err: any) {
      console.error('[AuthController.me] Error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
}
