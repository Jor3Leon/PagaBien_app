import { Controller, Post, Body, Get } from '@nestjs/common';

export interface GoogleAuthPayload {
  credential?: string;
  clientId?: string;
  email?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

@Controller('auth')
export class AuthController {
  @Post('google')
  async googleAuth(@Body() body: GoogleAuthPayload) {
    // If a Google JWT credential (credential) is passed, decode or verify it
    if (body.credential) {
      try {
        const parts = body.credential.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          return {
            success: true,
            user: {
              id: payload.sub,
              name: payload.name || payload.given_name || 'Usuario Google',
              email: payload.email,
              picture: payload.picture,
              token: body.credential,
            },
          };
        }
      } catch (e) {
        console.warn('Error al decodificar credencial de Google:', e);
      }
    }

    // Direct profile info provided (e.g. from frontend GIS or demo login)
    if (body.email) {
      return {
        success: true,
        user: {
          id: body.sub || 'google-user-id',
          name: body.name || body.email.split('@')[0],
          email: body.email,
          picture: body.picture || 'https://lh3.googleusercontent.com/a/default-user',
          token: body.credential || 'demo-google-token',
        },
      };
    }

    return {
      success: true,
      user: {
        id: 'demo-google-id',
        name: 'Usuario Administrador',
        email: 'admin@pagabien.app',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
        token: 'demo-token',
      },
    };
  }

  @Get('profile')
  getProfile() {
    return { status: 'auth-active' };
  }
}
