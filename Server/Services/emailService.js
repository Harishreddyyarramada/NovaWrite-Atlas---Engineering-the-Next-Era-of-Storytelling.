const nodemailer = require('nodemailer');

const hasEmailConfig =
  Boolean(process.env.EMAIL_USER) &&
  Boolean(process.env.EMAIL_PASS) &&
  Boolean(process.env.EMAIL_SERVICE);

const transporter = hasEmailConfig
  ? nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const sendLoginWelcomeDigestEmail = async ({
  toEmail,
  username,
  latestPosts = [],
  appUrl,
}) => {
  if (!transporter || !toEmail) return false;

  const safeAppUrl = appUrl || 'http://localhost:5173';
  const articlesHtml =
    latestPosts.length === 0
      ? '<p style="color:#5c6f91;margin:0;">No latest articles yet. Start creating your first one.</p>'
      : latestPosts
          .map(
            (post) => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e8edf7;">
              <a href="${safeAppUrl}/posts/${post._id}" style="color:#0b5fc0;text-decoration:none;font-weight:700;">${post.title}</a>
              <div style="font-size:12px;color:#5f7090;margin-top:4px;">
                ${post.category || 'General'} · ${formatDate(post.createdAt)}
              </div>
            </td>
          </tr>
        `
          )
          .join('');

  const html = `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f2f6ff;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%" style="max-width:700px;margin:20px auto;border-spacing:0;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dbe6fb;">
          <tr>
            <td style="padding:28px;background:linear-gradient(120deg,#0a5fbc,#0b8fab);color:#fff;">
              <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.92;">NovaWrite Atlas</div>
              <h2 style="margin:8px 0 0;font-size:28px;line-height:1.2;">Welcome back, ${username || 'Creator'}.</h2>
              <p style="margin:8px 0 0;color:#d9f4ff;">Ideas to impact, faster than ever.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 22px 8px;">
              <h3 style="margin:0 0 10px;color:#172848;">Latest Articles</h3>
              <table width="100%" style="border-spacing:0;background:#f8fbff;border:1px solid #e1eaf9;border-radius:12px;overflow:hidden;">
                ${articlesHtml}
              </table>
              <div style="margin-top:16px;">
                <a href="${safeAppUrl}/home" style="display:inline-block;padding:10px 16px;background:#0b5fc0;color:#fff;text-decoration:none;border-radius:10px;font-weight:700;">Open Dashboard</a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px;color:#6c7fa3;font-size:12px;text-align:center;background:#f6f9ff;">
              You are receiving this login update from NovaWrite Atlas.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'NovaWrite Atlas'}" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Welcome Back to NovaWrite Atlas',
    text: `Welcome back ${username || 'Creator'}. Check latest articles at ${safeAppUrl}/home`,
    html,
  });

  return true;
};

module.exports = { sendLoginWelcomeDigestEmail };
