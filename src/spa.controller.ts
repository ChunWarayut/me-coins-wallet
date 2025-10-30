import { Controller, Get, Req, Res } from '@nestjs/common';
import { Response, Request } from 'express';
import { join } from 'path';

@Controller()
export class SpaController {
  // SPA Fallback - Serve index.html for all non-API routes
  @Get('*')
  spaFallback(@Req() req: Request, @Res() res: Response) {
    // Skip API routes
    if (req.url.startsWith('/api') || 
        req.url.startsWith('/payments') || 
        req.url.startsWith('/auth') ||
        req.url.startsWith('/users') ||
        req.url.startsWith('/items') ||
        req.url.startsWith('/transactions') ||
        req.url.startsWith('/transfers') ||
        req.url.startsWith('/discord')) {
      return res.status(404).json({ message: 'Not Found', statusCode: 404 });
    }

    // Serve React SPA for all other routes
    return res.sendFile(join(process.cwd(), 'public', 'index.html'));
  }
}

