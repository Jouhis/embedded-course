/* Minimal newlib system-call stubs. _write() is weak: a project can
 * override it to send printf() output to a UART. */
#include <sys/stat.h>
#include <errno.h>

__attribute__((weak)) int _write(int fd, const char *buf, int len) { (void)fd; (void)buf; return len; }
int _read(int fd, char *buf, int len)   { (void)fd; (void)buf; (void)len; errno = ENOSYS; return -1; }
int _close(int fd)                      { (void)fd; return -1; }
int _lseek(int fd, int ptr, int dir)    { (void)fd; (void)ptr; (void)dir; return 0; }
int _fstat(int fd, struct stat *st)     { (void)fd; st->st_mode = S_IFCHR; return 0; }
int _isatty(int fd)                     { (void)fd; return 1; }
