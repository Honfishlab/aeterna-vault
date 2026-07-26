export function GET(request: Request) {
  return Response.redirect(new URL('/aeterna-standalone-viewer.html', request.url), 307);
}
