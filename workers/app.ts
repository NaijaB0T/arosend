import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import { z } from "zod";
import { cors } from "hono/cors";

// Database types
interface DatabaseFile {
  id: string;
  filename: string;
  filesize: number;
  r2_object_key: string;
  transfer_id: string;
  user_id: string;
  is_managed: number;
  upload_status?: string;
  extended_until?: number;
  transfer_status: string;
  transfer_created_at: number;
}

interface DatabaseUser {
  id: string;
  email: string;
  credits: number;
  created_at: number;
  updated_at: number;
}

interface DatabaseTransfer {
  id: string;
  status: string;
  expires_at: number;
  created_at: number;
}

interface PaystackInitResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    status: string;
    amount: number;
    reference: string;
    metadata?: {
      type?: string;
      transfer_id?: string;
      extension_days?: string;
      guest_email?: string;
    };
  };
}

const app = new Hono<{ Bindings: Env }>();

// Helper function to get or create user
async function getOrCreateUser(env: Env, email: string): Promise<string> {
  const result = await env.DB.prepare(
    `INSERT INTO users (id, email, credits, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (email) DO UPDATE SET email = email
     RETURNING id;`
  )
    .bind(crypto.randomUUID(), email, 0, Date.now(), Date.now())
    .first<{ id: string }>();
  if (!result) {
    throw new Error(`Unable to process user: ${email}`);
  }
  console.log(`Found or created user ${result.id} with email ${email}`);
  return result.id;
}

// Enable CORS for API routes
app.use('/api/*', cors());

// Validation schemas
const CreateTransferSchema = z.object({
  files: z.array(z.object({
    filename: z.string(),
    filesize: z.number().positive().max(15 * 1024 * 1024 * 1024) // 15GB limit
  }))
});

const CompleteTransferSchema = z.object({
  transferId: z.string(),
  key: z.string(),
  uploadId: z.string(),
  parts: z.array(z.object({
    partNumber: z.number().int().min(1),
    etag: z.string()
  }))
});

const PaymentInitializeSchema = z.object({
  amount: z.number().int().min(10000), // Minimum ₦100 in kobo (total including fee)
  credits_to_receive: z.number().int().min(100).optional(), // Actual credits user will receive
  email: z.string().email(),
  callback_url: z.string().url().optional()
});

const PaymentVerifySchema = z.object({
  reference: z.string()
});

const ExtendFileSchema = z.object({
  fileId: z.string(),
  days: z.number().int().min(1).max(365) // Max 1 year extension
});

// Auth Routes

// Helper function to send email via Resend
async function sendEmailWithResend(apiKey: string, to: string, subject: string, html: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Arosend <onboarding@aroko.femitaofeeq.com>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', response.status, errorData);
      return false;
    }

    const result = await response.json() as { id: string };
    console.log('Email sent successfully:', result.id);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Helper function to handle OpenAuth requests
async function handleOpenAuth(c: any) {
  console.log(`Auth route hit: ${c.req.method} ${c.req.url}`);
  try {
    // Dynamic import to avoid Vite issues
    const { issuer } = await import("@openauthjs/openauth");
    const { CloudflareStorage } = await import("@openauthjs/openauth/storage/cloudflare");
    const { PasswordProvider } = await import("@openauthjs/openauth/provider/password");
    const { PasswordUI } = await import("@openauthjs/openauth/ui/password");
    const { createSubjects } = await import("@openauthjs/openauth/subject");
    const { object, string } = await import("valibot");

    // Create subjects configuration
    const subjects = createSubjects({
      user: object({
        id: string(),
        email: string(),
      }),
    });

    // Simple path rewrite: /api/auth/xxx -> /xxx
    const originalUrl = new URL(c.req.url);
    const rewrittenPath = originalUrl.pathname.replace('/api/auth', '');
    const rewrittenUrl = new URL(rewrittenPath + originalUrl.search, originalUrl.origin);
    
    console.log(`Rewriting path: ${originalUrl.pathname} -> ${rewrittenPath}`);
    
    // Create a new request with the rewritten URL
    const rewrittenRequest = new Request(rewrittenUrl, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    });

    const issuerResponse = await issuer({
      storage: CloudflareStorage({
        namespace: c.env.AUTH_STORAGE,
      }),
      subjects,
      providers: {
        password: PasswordProvider(
          PasswordUI({
            sendCode: async (email, code) => {
              console.log(`Sending verification code to ${email}`);
              
              const emailHtml = `
                <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4f46e5; margin: 0;">Arosend</h1>
                    <p style="color: #666; margin: 5px 0 0 0;">Secure File Transfer</p>
                  </div>
                  
                  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; text-align: center;">
                    <h2 style="color: #1f2937; margin: 0 0 20px 0;">Your Verification Code</h2>
                    <div style="background: white; border: 2px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5;">${code}</div>
                    <p style="color: #6b7280; margin: 20px 0 0 0;">Enter this code to complete your registration or login.</p>
                  </div>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
                    <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                      This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
                    </p>
                  </div>
                </div>
              `;
              
              if (c.env.RESEND_API_KEY) {
                const success = await sendEmailWithResend(
                  c.env.RESEND_API_KEY, 
                  email, 
                  'Your Arosend Verification Code', 
                  emailHtml
                );
                
                if (!success) {
                  console.error('Failed to send verification email, falling back to console log');
                  console.log(`FALLBACK - Verification code for ${email}: ${code}`);
                }
              } else {
                console.error('RESEND_API_KEY not configured, logging code instead');
                console.log(`Verification code for ${email}: ${code}`);
              }
            },
            copy: {
              input_code: "Enter verification code",
            },
          }),
        ),
      },
      theme: {
        title: "Arosend",
        primary: "#4f46e5",
        favicon: "https://workers.cloudflare.com/favicon.ico",
        logo: {
          dark: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjAwIDUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8dGV4dCB4PSIxMCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMzMzMzMzIj5Bcm9zZW5kPC90ZXh0Pgo8L3N2Zz4",
          light: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjAwIDUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8dGV4dCB4PSIxMCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJzeXN0ZW0tdWksIC1hcHBsZS1zeXN0ZW0sIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMzMzMzMzIj5Bcm9zZW5kPC90ZXh0Pgo8L3N2Zz4"
        },
        css: `
          /* Style the logo/branding area */
          .logo {
            text-align: center;
            margin-bottom: 2rem;
            padding: 1rem 0;
          }
          
          .logo img {
            max-height: 60px;
          }
        `
      },
      success: async (ctx, value) => {
        const userId = await getOrCreateUser(c.env, value.email);
        console.log(`Authentication successful for user ${userId} (${value.email})`);
        
        // Instead of redirecting externally, redirect to the main app
        return new Response(null, {
          status: 302,
          headers: {
            'Location': '/?auth=success',
            'Set-Cookie': `auth_user=${encodeURIComponent(JSON.stringify({id: userId, email: value.email}))}; Path=/; HttpOnly; SameSite=Lax`
          }
        });
      },
    }).fetch(rewrittenRequest, c.env, c.executionCtx);
    
    return issuerResponse;
  } catch (error) {
    console.error("OpenAuth error:", error);
    return c.json({ error: "Authentication error" }, 500);
  }
}

// Chrome DevTools route (prevent noise in logs)
app.all("/.well-known/appspecific/com.chrome.devtools.json", (c) => new Response(null, { status: 204 }));

// OpenAuth endpoints - multiple patterns to catch all routes
app.all("/api/auth/password/authorize", handleOpenAuth);
app.all("/api/auth/password/register", handleOpenAuth);
app.all("/api/auth/password/*", handleOpenAuth);
app.all("/api/auth/*", handleOpenAuth);

// Logout endpoint - clears the auth cookie
app.post("/api/logout", async (c) => {
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'auth_user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    }
  });
});

// No callback routes needed - OpenAuth handles everything internally

// User info endpoint - reads from cookie
app.get("/api/userinfo", async (c) => {
  console.log("🔍 /api/userinfo endpoint called");
  
  try {
    // Get user data from cookie
    const authCookie = c.req.header("Cookie");
    console.log("📝 Cookie header:", authCookie ? "Present" : "Not present");
    
    const authUserMatch = authCookie?.match(/auth_user=([^;]+)/);
    console.log("🔑 Auth user match:", authUserMatch ? "Found" : "Not found");
    
    if (!authUserMatch) {
      console.log("❌ No auth cookie found, returning 401");
      return c.json({ error: "No authentication found" }, 401);
    }
    
    console.log("🔄 Parsing user data from cookie...");
    const userData = JSON.parse(decodeURIComponent(authUserMatch[1]));
    console.log("✅ User data parsed:", { id: userData.id });
    
    console.log("💾 Querying database for user...");
    // Get full user data from database
    const user = await c.env.DB.prepare(
      `SELECT id, email, credits FROM users WHERE id = ?`
    ).bind(userData.id).first();
    console.log("📊 Database query result:", user ? "User found" : "User not found");
    
    if (!user) {
      console.log("❌ User not found in database, returning 404");
      return c.json({ error: "User not found" }, 404);
    }
    
    console.log("✅ Returning user data");
    return c.json({
      id: user.id,
      email: user.email,
      credits: user.credits
    });
  } catch (error) {
    console.error("💥 Error in /api/userinfo:", error);
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    return c.json({ error: "Internal server error" }, 500);
  }
});

// API Routes

// Create a new transfer
app.post("/api/transfers", async (c) => {
  try {
    console.log('Creating transfer - parsing request body...');
    const body = await c.req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    console.log('Validating data...');
    const validatedData = CreateTransferSchema.parse(body);
    console.log('Validation successful');
    
    // Check if user is authenticated via cookie
    const authCookie = c.req.header("Cookie");
    const authUserMatch = authCookie?.match(/auth_user=([^;]+)/);
    let userId = null;
    let isAuthenticated = false;
    
    if (authUserMatch) {
      try {
        const userData = JSON.parse(decodeURIComponent(authUserMatch[1]));
        userId = userData.id;
        isAuthenticated = true;
        console.log(`Transfer being created by authenticated user: ${userId} (${userData.email})`);
      } catch (error) {
        console.log("Invalid auth cookie format");
      }
    } else {
      console.log("Transfer being created by anonymous user");
    }
    
    const transferId = crypto.randomUUID();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
    const createdAt = Date.now();
    
    console.log('Inserting transfer record...');
    console.log('Transfer ID:', transferId);
    
    // Check if database is available
    if (!c.env.DB) {
      console.error('Database binding not available');
      return c.json({ error: 'Database not configured' }, 500);
    }
    
    // Insert transfer record (handle both old and new schema)
    try {
      // Try new schema first
      await c.env.DB.prepare(`
        INSERT INTO transfers (id, status, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        transferId,
        'pending',
        expiresAt,
        createdAt
      ).run();
    } catch (error) {
      console.log('New schema failed, trying old schema compatibility...');
      // Fallback to old schema with dummy email values
      await c.env.DB.prepare(`
        INSERT INTO transfers (id, sender_email, recipient_emails, message, status, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        transferId,
        'anonymous@naijatransfer.com', // dummy email
        JSON.stringify(['anonymous@naijatransfer.com']), // dummy email array
        null, // no message
        'pending',
        expiresAt,
        createdAt
      ).run();
    }
    
    console.log('Transfer record inserted successfully');
    
    // Check if R2 bucket is available
    if (!c.env.FILE_BUCKET) {
      console.error('R2 bucket binding not available');
      return c.json({ error: 'File storage not configured' }, 500);
    }
    
    // Process files and create multipart uploads
    const fileResponses = [];
    
    console.log('Processing files...');
    for (const fileData of validatedData.files) {
      console.log('Processing file:', fileData.filename);
      
      const fileId = crypto.randomUUID();
      const r2Key = `transfers/${transferId}/${fileId}/${fileData.filename}`;
      
      console.log('Creating multipart upload for:', r2Key);
      
      // Create multipart upload
      const multipartUpload = await c.env.FILE_BUCKET.createMultipartUpload(r2Key);
      console.log('Multipart upload created, ID:', multipartUpload.uploadId);
      
      // Insert file record with user association if authenticated
      if (isAuthenticated) {
        await c.env.DB.prepare(`
          INSERT INTO files (id, transfer_id, filename, filesize, r2_object_key, user_id, is_managed, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          fileId,
          transferId,
          fileData.filename,
          fileData.filesize,
          r2Key,
          userId,
          1, // Mark as managed
          createdAt
        ).run();
      } else {
        await c.env.DB.prepare(`
          INSERT INTO files (id, transfer_id, filename, filesize, r2_object_key, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(
          fileId,
          transferId,
          fileData.filename,
          fileData.filesize,
          r2Key,
          createdAt
        ).run();
      }
      
      console.log('File record inserted for:', fileData.filename);
      
      fileResponses.push({
        fileId,
        filename: fileData.filename,
        uploadId: multipartUpload.uploadId,
        key: r2Key
      });
    }
    
    console.log('Transfer created successfully');
    return c.json({
      transferId,
      files: fileResponses
    });
    
  } catch (error) {
    console.error('Error creating transfer:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error instanceof z.ZodError) {
      console.log('Validation error details:', error.errors);
      return c.json({ error: 'Invalid request data', details: error.errors }, 400);
    }
    
    // Return more specific error information
    return c.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 500);
  }
});

// Upload chunk directly
app.post("/api/uploads/chunk", async (c) => {
  try {
    const formData = await c.req.formData();
    const key = formData.get('key') as string;
    const uploadId = formData.get('uploadId') as string;
    const partNumber = parseInt(formData.get('partNumber') as string);
    const chunk = formData.get('chunk') as File;
    
    if (!key || !uploadId || !partNumber || !chunk) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    console.log(`Uploading part ${partNumber} for upload ${uploadId}`);
    
    const multipartUpload = c.env.FILE_BUCKET.resumeMultipartUpload(key, uploadId);
    const uploadPart = await multipartUpload.uploadPart(partNumber, chunk);
    
    console.log(`Part ${partNumber} uploaded successfully with etag: ${uploadPart.etag}`);
    
    return c.json({ 
      partNumber,
      etag: uploadPart.etag 
    });
    
  } catch (error) {
    console.error('Error uploading chunk:', error);
    return c.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Validate transfer for resumption
app.get("/api/transfers/validate/:transferId", async (c) => {
  try {
    const transferId = c.req.param('transferId');
    
    // Check if transfer exists and is not expired
    const transfer = await c.env.DB.prepare(`
      SELECT * FROM transfers WHERE id = ? AND expires_at > ?
    `).bind(transferId, Date.now()).first();
    
    if (!transfer) {
      return c.json({ 
        valid: false, 
        reason: 'Transfer not found or expired' 
      });
    }
    
    // If transfer is already complete, no need to resume
    if (transfer.status === 'complete') {
      return c.json({ 
        valid: false, 
        reason: 'Transfer already completed' 
      });
    }
    
    return c.json({ 
      valid: true, 
      transfer: {
        id: transfer.id,
        status: transfer.status,
        expires_at: transfer.expires_at,
        created_at: transfer.created_at
      }
    });
    
  } catch (error) {
    console.error('Error validating transfer:', error);
    return c.json({ 
      valid: false, 
      reason: 'Server error during validation' 
    }, 500);
  }
});

// Get upload status for resumption
app.get("/api/uploads/status/:transferId/:fileId", async (c) => {
  try {
    const transferId = c.req.param('transferId');
    const fileId = c.req.param('fileId');
    
    // Get file details from database
    const file = await c.env.DB.prepare(`
      SELECT * FROM files WHERE id = ? AND transfer_id = ?
    `).bind(fileId, transferId).first();
    
    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    // For R2, we can't directly query uploaded parts, but we can return what we know
    return c.json({
      fileId,
      filename: file.filename,
      filesize: file.filesize,
      r2_object_key: file.r2_object_key,
      // Note: R2 doesn't provide a way to list uploaded parts
      // so resumption relies on client-side state
      message: 'Use client-side state for resumption'
    });
    
  } catch (error) {
    console.error('Error getting upload status:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Simple upload for small files (< 5MB) - bypasses multipart upload limitations
app.put("/api/upload-simple/*", async (c) => {
  try {
    // Extract the key from the URL path (everything after /api/upload-simple/)
    const url = new URL(c.req.url);
    const key = decodeURIComponent(url.pathname.replace('/api/upload-simple/', ''));
    console.log('📦 Simple upload for key:', key);
    
    // Get the file data from the request body
    const fileBody = await c.req.arrayBuffer();
    console.log('📦 File size:', fileBody.byteLength);
    
    if (!fileBody || fileBody.byteLength === 0) {
      return c.json({ error: 'No file data provided' }, 400);
    }
    
    // Upload directly to R2 using simple PUT
    const object = await c.env.FILE_BUCKET.put(key, fileBody, {
      httpMetadata: {
        contentType: c.req.header('content-type') || 'application/octet-stream'
      }
    });
    
    console.log('✅ Simple upload completed:', object.key);
    
    return c.json({ 
      success: true, 
      key: object.key,
      etag: object.etag,
      version: object.version
    });
    
  } catch (error) {
    console.error('❌ Simple upload failed:', error);
    return c.json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Complete multipart upload
app.post("/api/transfers/complete", async (c) => {
  try {
    console.log('🔄 Completing multipart upload...');
    const body = await c.req.json();
    console.log('📝 Request body keys:', Object.keys(body));
    console.log('📝 Parts count:', body.parts?.length || 0);
    
    const validatedData = CompleteTransferSchema.parse(body);
    console.log('✅ Validation successful');
    
    // Check if this is a single upload (indicated by placeholder etag)
    const isSingleUpload = validatedData.parts.length === 1 && validatedData.parts[0].etag === 'single-upload';
    
    let object;
    if (isSingleUpload) {
      console.log('📦 Completing single upload for key:', validatedData.key);
      // For single uploads, we don't need to complete multipart - file is already uploaded
      // Just verify the object exists in R2
      object = await c.env.FILE_BUCKET.head(validatedData.key);
      console.log('✅ Single upload verified successfully');
    } else {
      // Complete the multipart upload
      console.log('📤 Resuming multipart upload for key:', validatedData.key);
      const multipartUpload = c.env.FILE_BUCKET.resumeMultipartUpload(
        validatedData.key,
        validatedData.uploadId
      );
      
      console.log('🔗 Completing upload with parts:', validatedData.parts.length);
      object = await multipartUpload.complete(validatedData.parts);
      console.log('✅ Multipart upload completed successfully');
    }
    
    // Update file upload status to completed
    console.log('💾 Updating file upload status to completed...');
    const fileResult = await c.env.DB.prepare(`
      UPDATE files SET upload_status = 'completed' WHERE transfer_id = ? AND r2_object_key = ?
    `).bind(validatedData.transferId, validatedData.key).run();
    console.log('✅ File status updated, success:', fileResult.success);
    
    // Update transfer status to complete
    console.log('💾 Updating transfer status to complete...');
    const dbResult = await c.env.DB.prepare(`
      UPDATE transfers SET status = 'complete' WHERE id = ?
    `).bind(validatedData.transferId).run();
    console.log('✅ Transfer status updated, success:', dbResult.success);
    
    return c.json({ success: true, object });
    
  } catch (error) {
    console.error('❌ Error completing transfer:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      return c.json({ error: 'Invalid request data', details: error.errors }, 400);
    }
    
    return c.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Download file endpoint
app.get("/api/download/:transferId", async (c) => {
  try {
    const transferId = c.req.param('transferId');
    
    // Get transfer details
    const transfer = await c.env.DB.prepare(`
      SELECT * FROM transfers WHERE id = ? AND status = 'complete' AND expires_at > ?
    `).bind(transferId, Date.now()).first();
    
    if (!transfer) {
      return c.json({ error: 'Transfer not found or expired' }, 404);
    }
    
    // Get files for this transfer
    const files = await c.env.DB.prepare(`
      SELECT * FROM files WHERE transfer_id = ?
    `).bind(transferId).all();
    
    return c.json({
      transfer,
      files: files.results
    });
    
  } catch (error) {
    console.error('Error fetching download:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get file content
app.get("/api/file/:transferId/:filename", async (c) => {
  try {
    const transferId = c.req.param('transferId');
    const filename = c.req.param('filename');
    
    // Verify transfer exists and is not expired
    const transfer = await c.env.DB.prepare(`
      SELECT * FROM transfers WHERE id = ? AND status = 'complete' AND expires_at > ?
    `).bind(transferId, Date.now()).first();
    
    if (!transfer) {
      return c.json({ error: 'Transfer not found or expired' }, 404);
    }
    
    // Get file details
    const file = await c.env.DB.prepare(`
      SELECT * FROM files WHERE transfer_id = ? AND filename = ?
    `).bind(transferId, filename).first();
    
    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }
    
    // Get file from R2
    const object = await c.env.FILE_BUCKET.get(file.r2_object_key as string);
    
    if (!object) {
      return c.json({ error: 'File not found in storage' }, 404);
    }
    
    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': object.size.toString()
      }
    });
    
  } catch (error) {
    console.error('Error downloading file:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// File Management API Routes

// Get transfer details (for file page)
app.get("/api/transfers/:transferId", async (c) => {
  try {
    const transferId = c.req.param('transferId');
    console.log("🔍 /api/transfers/:transferId called with ID:", transferId);
    
    // Get transfer details
    console.log("💾 Querying transfers table...");
    const transfer = await c.env.DB.prepare(`
      SELECT * FROM transfers WHERE id = ?
    `).bind(transferId).first<DatabaseTransfer>();
    console.log("📊 Transfer query result:", transfer ? "Found" : "Not found");
    
    if (!transfer) {
      console.log("❌ Transfer not found, returning 404");
      return c.json({ error: 'Transfer not found' }, 404);
    }
    
    // Get files for this transfer
    console.log("💾 Querying files for transfer...");
    const files = await c.env.DB.prepare(`
      SELECT * FROM files WHERE transfer_id = ?
    `).bind(transferId).all<DatabaseFile>();
    console.log("📊 Files query result:", files.results?.length || 0, "files found");
    
    return c.json({
      id: transfer.id,
      status: transfer.status,
      expires_at: transfer.expires_at,
      created_at: transfer.created_at,
      files: files.results?.map(file => ({
        id: file.id,
        filename: file.filename,
        size: file.filesize,
        upload_status: file.upload_status || 'completed'
      })) || []
    });
    
  } catch (error) {
    console.error('Error fetching transfer:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Extend transfer for guests (payment required)
app.post("/api/extend-transfer", async (c) => {
  try {
    const body = await c.req.json();
    const { transferId, days, email, amount } = body;
    
    if (!transferId || !days || !email || !amount) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    if (amount < 10000) { // Minimum ₦100 in kobo
      return c.json({ error: 'Minimum extension cost is ₦100' }, 400);
    }
    
    // Get transfer to verify it exists
    const transfer = await c.env.DB.prepare(`
      SELECT * FROM transfers WHERE id = ?
    `).bind(transferId).first<DatabaseTransfer>();
    
    if (!transfer) {
      return c.json({ error: 'Transfer not found' }, 404);
    }
    
    // Initialize payment with Paystack
    const paymentData = {
      email: email,
      amount: amount,
      currency: 'NGN',
      callback_url: `${c.env.BASE_URL}/file/${transferId}?payment=success`,
      metadata: {
        type: 'extension',
        transfer_id: transferId,
        extension_days: days,
        guest_email: email
      }
    };
    
    const paymentResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });
    
    if (!paymentResponse.ok) {
      console.error('Paystack initialization failed:', await paymentResponse.text());
      return c.json({ error: 'Payment initialization failed' }, 500);
    }
    
    const paymentResult = await paymentResponse.json() as PaystackInitResponse;
    
    return c.json({
      authorization_url: paymentResult.data?.authorization_url || '',
      reference: paymentResult.data?.reference || ''
    });
    
  } catch (error) {
    console.error('Error initializing extension payment:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Extend transfer using credits (for authenticated users)
app.post("/api/extend-transfer-credits", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = authHeader.slice(7);
    const body = await c.req.json();
    const { transferId, days } = body;
    
    if (!transferId || !days) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    if (days < 1 || days > 365) {
      return c.json({ error: 'Invalid extension days' }, 400);
    }
    
    // Get transfer to verify it exists
    const transfer = await c.env.DB.prepare(`
      SELECT * FROM transfers WHERE id = ?
    `).bind(transferId).first<DatabaseTransfer>();
    
    if (!transfer) {
      return c.json({ error: 'Transfer not found' }, 404);
    }
    
    // Get transfer files to calculate total cost
    const files = await c.env.DB.prepare(`
      SELECT * FROM files WHERE transfer_id = ?
    `).bind(transferId).all<DatabaseFile>();
    
    if (!files.results || files.results.length === 0) {
      return c.json({ error: 'No files found for transfer' }, 404);
    }
    
    // Calculate total extension cost using precise calculation for credits
    const totalSizeBytes = files.results.reduce((sum, file) => sum + (file.filesize as number), 0);
    const extensionCost = calculatePreciseExtensionCost(totalSizeBytes, days);
    
    // Check user's credit balance
    const user = await c.env.DB.prepare(`
      SELECT credits FROM users WHERE id = ?
    `).bind(userId).first<Pick<DatabaseUser, 'credits'>>();
    
    if (!user || (user.credits as number) < extensionCost) {
      return c.json({ 
        error: 'Insufficient credits',
        required_credits: extensionCost,
        current_credits: (user?.credits as number) || 0
      }, 400);
    }
    
    // Calculate new expiry (extend from current expiry or now, whichever is later)
    const currentExpiry = transfer.expires_at as number;
    const newExpiry = Math.max(currentExpiry, Date.now()) + (days * 24 * 60 * 60 * 1000);
    
    // Start transaction - deduct credits and update transfer
    const now = Date.now();
    
    // Deduct credits from user
    await c.env.DB.prepare(`
      UPDATE users SET credits = credits - ?, updated_at = ? WHERE id = ?
    `).bind(extensionCost, now, userId).run();
    
    // Update transfer expiry
    await c.env.DB.prepare(`
      UPDATE transfers SET expires_at = ? WHERE id = ?
    `).bind(newExpiry, transferId).run();
    
    // Record extension transaction
    await c.env.DB.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, credits, description, reference, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      userId,
      'debit',
      extensionCost * 100, // Convert to kobo for consistency
      -extensionCost,
      `Transfer extension - ${transferId} for ${days} day(s)`,
      `transfer_extension_${crypto.randomUUID()}`,
      'success',
      now,
      now
    ).run();
    
    console.log(`Extended transfer ${transferId} by ${days} days using ${extensionCost} credits`);
    
    return c.json({ 
      success: true,
      new_expiry: newExpiry,
      cost_paid: extensionCost,
      remaining_credits: (user.credits as number) - extensionCost
    });
    
  } catch (error) {
    console.error('Error extending transfer with credits:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Calculate extension cost based on file size and days (rounded up for guest payments)
function calculateExtensionCost(fileSizeBytes: number, days: number): number {
  const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024); // Convert bytes to GB
  const costPerGBPerDay = 2; // ₦2 per GB per day
  return Math.ceil(fileSizeGB * days * costPerGBPerDay); // Round up to nearest naira
}

// Calculate precise extension cost for credit-based extensions
function calculatePreciseExtensionCost(fileSizeBytes: number, days: number): number {
  const fileSizeGB = fileSizeBytes / (1024 * 1024 * 1024); // Convert bytes to GB
  const costPerGBPerDay = 2; // ₦2 per GB per day
  return fileSizeGB * days * costPerGBPerDay; // Precise calculation without rounding
}

// Get user's managed files
app.get("/api/files", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = authHeader.slice(7);
    
    // Get user's managed files
    const files = await c.env.DB.prepare(`
      SELECT f.*, t.status as transfer_status, t.created_at as transfer_created_at
      FROM files f
      LEFT JOIN transfers t ON f.transfer_id = t.id
      WHERE f.user_id = ? AND f.is_managed = 1
      ORDER BY f.created_at DESC
    `).bind(userId).all<DatabaseFile>();
    
    return c.json({ 
      files: files.results?.map(file => ({
        ...file,
        // Calculate current expiry (either original 24h or extended)
        current_expiry: file.extended_until || ((file.transfer_created_at as number) + (24 * 60 * 60 * 1000)),
        // Calculate if file is expired
        is_expired: (file.extended_until || ((file.transfer_created_at as number) + (24 * 60 * 60 * 1000))) < Date.now(),
        // Calculate extension cost for 1 day
        extension_cost_per_day: calculateExtensionCost(file.filesize as number, 1)
      })) || []
    });
    
  } catch (error) {
    console.error('Error fetching user files:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Extend file expiry
app.post("/api/files/extend", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = authHeader.slice(7);
    const body = await c.req.json();
    const validatedData = ExtendFileSchema.parse(body);
    
    // Get file details
    const file = await c.env.DB.prepare(`
      SELECT f.*, t.created_at as transfer_created_at
      FROM files f
      LEFT JOIN transfers t ON f.transfer_id = t.id
      WHERE f.id = ? AND f.user_id = ? AND f.is_managed = 1
    `).bind(validatedData.fileId, userId).first<DatabaseFile>();
    
    if (!file) {
      return c.json({ error: 'File not found or not accessible' }, 404);
    }
    
    // Calculate extension cost using precise calculation for credits
    const extensionCost = calculatePreciseExtensionCost(file.filesize as number, validatedData.days);
    
    // Check user's credit balance
    const user = await c.env.DB.prepare(`
      SELECT credits FROM users WHERE id = ?
    `).bind(userId).first<Pick<DatabaseUser, 'credits'>>();
    
    if (!user || (user.credits as number) < extensionCost) {
      return c.json({ 
        error: 'Insufficient credits',
        required_credits: extensionCost,
        current_credits: (user?.credits as number) || 0
      }, 400);
    }
    
    // Calculate new expiry date
    const currentExpiry = file.extended_until || ((file.transfer_created_at as number) + (24 * 60 * 60 * 1000));
    const newExpiry = Math.max(currentExpiry, Date.now()) + (validatedData.days * 24 * 60 * 60 * 1000);
    
    // Start transaction
    const extensionId = crypto.randomUUID();
    const now = Date.now();
    
    // Deduct credits from user
    await c.env.DB.prepare(`
      UPDATE users SET credits = credits - ?, updated_at = ? WHERE id = ?
    `).bind(extensionCost, now, userId).run();
    
    // Update file expiry
    await c.env.DB.prepare(`
      UPDATE files SET 
        extended_until = ?,
        total_extensions = total_extensions + 1,
        total_extension_cost = total_extension_cost + ?
      WHERE id = ?
    `).bind(newExpiry, extensionCost, validatedData.fileId).run();
    
    // Record extension transaction
    await c.env.DB.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, credits, description, reference, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      userId,
      'debit',
      extensionCost * 100, // Convert to kobo for consistency
      -extensionCost,
      `File extension - ${file.filename} for ${validatedData.days} day(s)`,
      `extension_${extensionId}`,
      'success',
      now,
      now
    ).run();
    
    // Record extension history
    await c.env.DB.prepare(`
      INSERT INTO file_extensions (id, file_id, user_id, days_extended, cost_in_credits, new_expiry_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      extensionId,
      validatedData.fileId,
      userId,
      validatedData.days,
      extensionCost,
      newExpiry,
      now
    ).run();
    
    return c.json({ 
      success: true,
      new_expiry: newExpiry,
      cost_paid: extensionCost,
      remaining_credits: (user.credits as number) - extensionCost
    });
    
  } catch (error) {
    console.error('Error extending file:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request data', details: error.errors }, 400);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete managed file
app.delete("/api/files/:fileId", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = authHeader.slice(7);
    const fileId = c.req.param('fileId');
    
    // Get file details
    const file = await c.env.DB.prepare(`
      SELECT * FROM files WHERE id = ? AND user_id = ? AND is_managed = 1
    `).bind(fileId, userId).first<DatabaseFile>();
    
    if (!file) {
      return c.json({ error: 'File not found or not accessible' }, 404);
    }
    
    // Delete file from R2
    if (file.r2_object_key) {
      try {
        await c.env.FILE_BUCKET.delete(file.r2_object_key as string);
      } catch (error) {
        console.error('Error deleting file from R2:', error);
      }
    }
    
    // Delete file record and associated extensions
    await c.env.DB.prepare(`
      DELETE FROM file_extensions WHERE file_id = ?
    `).bind(fileId).run();
    
    await c.env.DB.prepare(`
      DELETE FROM files WHERE id = ?
    `).bind(fileId).run();
    
    return c.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting file:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get file extension history
app.get("/api/files/:fileId/extensions", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = authHeader.slice(7);
    const fileId = c.req.param('fileId');
    
    // Verify file ownership
    const file = await c.env.DB.prepare(`
      SELECT id FROM files WHERE id = ? AND user_id = ? AND is_managed = 1
    `).bind(fileId, userId).first();
    
    if (!file) {
      return c.json({ error: 'File not found or not accessible' }, 404);
    }
    
    // Get extension history
    const extensions = await c.env.DB.prepare(`
      SELECT * FROM file_extensions WHERE file_id = ? ORDER BY created_at DESC
    `).bind(fileId).all();
    
    return c.json({ extensions: extensions.results || [] });
    
  } catch (error) {
    console.error('Error fetching file extensions:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Credits and Payment API Routes

// Get user credits
app.get("/api/credits", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = authHeader.slice(7);
    
    // Get or create user
    let user = await c.env.DB.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(userId).first<DatabaseUser>();
    
    if (!user) {
      // Create user if doesn't exist
      await c.env.DB.prepare(`
        INSERT INTO users (id, email, credits, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(userId, 'user@example.com', 0, Date.now(), Date.now()).run();
      
      user = { id: userId, email: 'user@example.com', credits: 0, created_at: Date.now(), updated_at: Date.now() };
    }
    
    return c.json({ credits: user.credits || 0 });
    
  } catch (error) {
    console.error('Error fetching credits:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get user transactions
app.get("/api/transactions", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = authHeader.slice(7);
    
    // Get recent transactions with pagination
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const transactions = await c.env.DB.prepare(`
      SELECT id, type, amount, credits, description, status, created_at, updated_at
      FROM transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(userId, limit, offset).all();
    
    return c.json({ 
      transactions: transactions.results,
      total: transactions.results.length
    });
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Debug endpoint to check recent transactions for a user
app.get("/api/transactions/debug", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = authHeader.slice(7);
    
    // Get recent transactions
    const transactions = await c.env.DB.prepare(`
      SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
    `).bind(userId).all();
    
    return c.json({ 
      userId,
      transactions: transactions.results 
    });
    
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Initialize payment with Paystack
app.post("/api/payments/initialize", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const userId = authHeader.slice(7);
    const body = await c.req.json();
    const validatedData = PaymentInitializeSchema.parse(body);
    
    // Create transaction record
    const transactionId = crypto.randomUUID();
    const reference = `arosend_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Use credits_to_receive if provided (new fee structure), otherwise use old calculation
    const credits = validatedData.credits_to_receive || Math.floor(validatedData.amount / 100);
    const totalAmount = validatedData.amount;
    const creditValue = credits * 100; // Convert credits to kobo
    const fee = totalAmount - creditValue; // Calculate fee
    
    await c.env.DB.prepare(`
      INSERT INTO transactions (id, user_id, type, amount, credits, description, reference, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      transactionId,
      userId,
      'credit',
      totalAmount,
      credits,
      `Credit purchase - ${credits} credits (₦${Math.floor(fee/100)} fee included)`,
      reference,
      'pending',
      Date.now(),
      Date.now()
    ).run();
    
    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: validatedData.email,
        amount: validatedData.amount,
        reference: reference,
        callback_url: validatedData.callback_url || `${new URL(c.req.url).origin}/account?payment=success`,
        metadata: {
          userId: userId,
          transactionId: transactionId,
          credits: credits,
          fee_included: Math.floor(fee/100) // Fee amount in Naira for tracking
        }
      })
    });
    
    if (!paystackResponse.ok) {
      throw new Error('Paystack initialization failed');
    }
    
    const paystackData: PaystackInitResponse = await paystackResponse.json();
    
    // Create payment record
    await c.env.DB.prepare(`
      INSERT INTO payments (id, user_id, transaction_id, paystack_reference, amount, status, paystack_response, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      userId,
      transactionId,
      reference,
      validatedData.amount,
      'pending',
      JSON.stringify(paystackData),
      Date.now(),
      Date.now()
    ).run();
    
    return c.json(paystackData);
    
  } catch (error) {
    console.error('Error initializing payment:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request data', details: error.errors }, 400);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Verify payment (webhook and manual verification)
app.post("/api/payments/verify", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = PaymentVerifySchema.parse(body);
    
    // Verify with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${validatedData.reference}`, {
      headers: {
        'Authorization': `Bearer ${c.env.PAYSTACK_SECRET_KEY}`
      }
    });
    
    if (!paystackResponse.ok) {
      throw new Error('Paystack verification failed');
    }
    
    const paystackData: PaystackVerifyResponse = await paystackResponse.json();
    
    if (paystackData.status && paystackData.data?.status === 'success') {
      // Check if this is an extension payment (guest payment)
      if (paystackData.data.metadata?.type === 'extension') {
        const metadata = paystackData.data.metadata;
        const transferId = metadata.transfer_id || '';
        const days = parseInt(metadata.extension_days || '1');
        
        // Get transfer to extend
        const transfer = await c.env.DB.prepare(`
          SELECT * FROM transfers WHERE id = ?
        `).bind(transferId).first<DatabaseTransfer>();
        
        if (transfer) {
          // Calculate new expiry (extend from current expiry or now, whichever is later)
          const currentExpiry = transfer.expires_at as number;
          const newExpiry = Math.max(currentExpiry, Date.now()) + (days * 24 * 60 * 60 * 1000);
          
          // Update transfer expiry
          await c.env.DB.prepare(`
            UPDATE transfers SET expires_at = ? WHERE id = ?
          `).bind(newExpiry, transferId).run();
          
          console.log(`Extended transfer ${transferId} by ${days} days`);
        }
        
        return c.json({ status: 'success', type: 'extension', transfer_id: transferId });
      }
      
      // Handle regular credit payments
      const transaction = await c.env.DB.prepare(`
        SELECT * FROM transactions WHERE reference = ?
      `).bind(validatedData.reference).first();
      
      if (!transaction) {
        return c.json({ error: 'Transaction not found' }, 404);
      }
      
      // Check if transaction is already processed to prevent double crediting
      if (transaction.status === 'success') {
        return c.json({ status: 'already_processed', credits_added: transaction.credits });
      }
      
      // Update transaction status
      await c.env.DB.prepare(`
        UPDATE transactions SET status = 'success', updated_at = ? WHERE id = ?
      `).bind(Date.now(), transaction.id).run();
      
      // Update payment status
      await c.env.DB.prepare(`
        UPDATE payments SET status = 'success', paystack_response = ?, updated_at = ? WHERE paystack_reference = ?
      `).bind(JSON.stringify(paystackData), Date.now(), validatedData.reference).run();
      
      // Add credits to user account (only if transaction wasn't already successful)
      await c.env.DB.prepare(`
        UPDATE users SET credits = credits + ?, updated_at = ? WHERE id = ?
      `).bind(transaction.credits, Date.now(), transaction.user_id).run();
      
      return c.json({ status: 'success', credits_added: transaction.credits });
    } else {
      // Payment failed
      await c.env.DB.prepare(`
        UPDATE transactions SET status = 'failed', updated_at = ? WHERE reference = ?
      `).bind(Date.now(), validatedData.reference).run();
      
      await c.env.DB.prepare(`
        UPDATE payments SET status = 'failed', paystack_response = ?, updated_at = ? WHERE paystack_reference = ?
      `).bind(JSON.stringify(paystackData), Date.now(), validatedData.reference).run();
      
      return c.json({ status: 'failed', message: 'Payment verification failed' });
    }
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Invalid request data', details: error.errors }, 400);
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Paystack webhook
app.post("/api/webhooks/paystack", async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header('x-paystack-signature');
    
    // Verify webhook signature
    const hash = await crypto.subtle.digest(
      'SHA-512',
      new TextEncoder().encode(c.env.PAYSTACK_SECRET_KEY + body)
    );
    const expectedSignature = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    if (signature !== expectedSignature) {
      return c.json({ error: 'Invalid signature' }, 400);
    }
    
    const event = JSON.parse(body);
    
    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      
      // Verify and process payment
      await fetch(`${new URL(c.req.url).origin}/api/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference })
      });
    }
    
    return c.json({ status: 'success' });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Helper function to clean up a completed transfer
async function cleanupTransfer(env: Env, transferId: string, reason: string) {
  try {
    // Get files for this transfer
    const files = await env.DB.prepare(`
      SELECT r2_object_key FROM files WHERE transfer_id = ?
    `).bind(transferId).all();
    
    // Delete files from R2
    for (const file of files.results as Array<{ r2_object_key: string }>) {
      if (file.r2_object_key) {
        try {
          await env.FILE_BUCKET.delete(file.r2_object_key);
          console.log(`Deleted ${reason} file: ${file.r2_object_key}`);
        } catch (error) {
          console.error(`Error deleting file ${file.r2_object_key}:`, error);
        }
      }
    }
    
    // Delete file records
    await env.DB.prepare(`
      DELETE FROM files WHERE transfer_id = ?
    `).bind(transferId).run();
    
    // Delete transfer record
    await env.DB.prepare(`
      DELETE FROM transfers WHERE id = ?
    `).bind(transferId).run();
    
  } catch (error) {
    console.error(`Error cleaning up transfer ${transferId}:`, error);
  }
}

// Helper function to clean up incomplete transfers and their multipart uploads
async function cleanupIncompleteTransfer(env: Env, transferId: string) {
  try {
    // Get files for this transfer with their upload metadata
    const files = await env.DB.prepare(`
      SELECT r2_object_key FROM files WHERE transfer_id = ?
    `).bind(transferId).all();
    
    // For incomplete transfers, we need to abort multipart uploads
    // Note: R2 doesn't provide a direct way to list/abort multipart uploads
    // So we'll just delete any partial objects and let R2's lifecycle policies handle cleanup
    for (const file of files.results as Array<{ r2_object_key: string }>) {
      if (file.r2_object_key) {
        try {
          // Try to delete the object (in case it was partially uploaded)
          await env.FILE_BUCKET.delete(file.r2_object_key);
          console.log(`Cleaned up abandoned upload: ${file.r2_object_key}`);
        } catch (error) {
          // This is expected for incomplete uploads - the object doesn't exist yet
          console.log(`No object to delete for ${file.r2_object_key} (expected for incomplete upload)`);
        }
      }
    }
    
    // Delete file records
    await env.DB.prepare(`
      DELETE FROM files WHERE transfer_id = ?
    `).bind(transferId).run();
    
    // Delete transfer record
    await env.DB.prepare(`
      DELETE FROM transfers WHERE id = ?
    `).bind(transferId).run();
    
    console.log(`Cleaned up abandoned transfer: ${transferId}`);
    
  } catch (error) {
    console.error(`Error cleaning up incomplete transfer ${transferId}:`, error);
  }
}

app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});

// Cron job for cleanup
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('Running cleanup cron job...');
    
    try {
      const now = Date.now();
      
      // 1. Clean up completed expired transfers (unmanaged files)
      const expiredTransfers = await env.DB.prepare(`
        SELECT id FROM transfers WHERE expires_at < ? AND status = 'complete'
      `).bind(now).all();
      
      for (const transfer of expiredTransfers.results as Array<{ id: string }>) {
        await cleanupTransfer(env, transfer.id, 'expired completed');
      }
      
      // 2. Clean up abandoned incomplete transfers (older than 24 hours)
      const abandonedTransfers = await env.DB.prepare(`
        SELECT id FROM transfers WHERE expires_at < ? AND status = 'pending'
      `).bind(now).all();
      
      for (const transfer of abandonedTransfers.results as Array<{ id: string }>) {
        await cleanupIncompleteTransfer(env, transfer.id);
      }
      
      // 3. Clean up expired managed files (user files that weren't extended)
      const expiredManagedFiles = await env.DB.prepare(`
        SELECT f.id, f.r2_object_key, f.filename, t.created_at as transfer_created_at
        FROM files f
        LEFT JOIN transfers t ON f.transfer_id = t.id
        WHERE f.is_managed = 1 
        AND (
          (f.extended_until IS NOT NULL AND f.extended_until < ?) OR
          (f.extended_until IS NULL AND (t.created_at + 86400000) < ?)
        )
      `).bind(now, now).all();
      
      for (const file of expiredManagedFiles.results as Array<{ id: string, r2_object_key: string, filename: string }>) {
        try {
          // Delete file from R2
          if (file.r2_object_key) {
            await env.FILE_BUCKET.delete(file.r2_object_key);
            console.log(`Deleted expired managed file: ${file.filename}`);
          }
          
          // Delete file extensions
          await env.DB.prepare(`
            DELETE FROM file_extensions WHERE file_id = ?
          `).bind(file.id).run();
          
          // Delete file record
          await env.DB.prepare(`
            DELETE FROM files WHERE id = ?
          `).bind(file.id).run();
          
        } catch (error) {
          console.error(`Error cleaning up expired managed file ${file.filename}:`, error);
        }
      }
      
      console.log(`Cleaned up ${expiredTransfers.results.length} expired transfers, ${abandonedTransfers.results.length} abandoned transfers, and ${expiredManagedFiles.results.length} expired managed files`);
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
};
