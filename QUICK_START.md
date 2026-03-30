# Quick Start Guide - Failed Notification Jobs Dashboard

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies (1 min)
```bash
cd xconfess-frontend
npm install
```

### 2. Run Tests (1 min)
```bash
npm test
```

Expected output:
```
PASS  app/(dashboard)/admin/notifications/__tests__/page.test.tsx
PASS  app/lib/api/__tests__/admin-notifications.test.ts
PASS  app/lib/hooks/__tests__/useDebounce.test.ts

Test Suites: 3 passed, 3 total
Tests:       50+ passed, 50+ total
```

### 3. Start Development Server (1 min)
```bash
npm run dev
```

### 4. Access the Dashboard (1 min)
1. Open browser: http://localhost:3000
2. Login as admin
3. Navigate to: http://localhost:3000/admin/notifications

### 5. Enable Mock Mode (Optional, 1 min)
If backend is not running:
```javascript
// In browser console
localStorage.setItem('adminMock', 'true');
// Refresh page
```

## 📋 What You'll See

### Desktop View
- Sidebar with "Notifications" link
- Filter controls (Status, Date Range, Min Retries)
- Table with failed jobs
- Pagination controls
- Replay buttons

### Mobile View
- Hamburger menu
- Stacked filters
- Card layout for jobs
- Touch-friendly buttons

## 🎯 Try These Actions

### 1. Filter Jobs
- Change status dropdown
- Set date range
- Set minimum retries
- Watch results update (debounced)

### 2. Navigate Pages
- Click "Next" button
- Click "Previous" button
- See page numbers update

### 3. Replay a Job
- Click "Replay" button
- Confirm in dialog
- Watch optimistic update
- See success feedback

### 4. Test Error Handling
- Disconnect network
- Try to load page
- See error message
- Click "Retry"

## 🧪 Run Specific Tests

### Page Component Tests
```bash
npm test -- page.test.tsx
```

### API Client Tests
```bash
npm test -- admin-notifications.test.ts
```

### Hook Tests
```bash
npm test -- useDebounce.test.ts
```

### Watch Mode
```bash
npm test -- --watch
```

### Coverage Report
```bash
npm test -- --coverage
```

## 🐛 Troubleshooting

### Tests Failing?
```bash
# Clear cache
npm test -- --clearCache

# Reinstall
rm -rf node_modules package-lock.json
npm install
```

### Page Not Loading?
1. Check backend is running
2. Check API URL in .env.local
3. Enable mock mode
4. Check browser console

### TypeScript Errors?
```bash
# Type check
npx tsc --noEmit

# Rebuild
npm run build
```

## 📚 Next Steps

1. **Read Documentation**
   - `app/(dashboard)/admin/notifications/README.md`
   - `NOTIFICATIONS_DASHBOARD_IMPLEMENTATION.md`
   - `VISUAL_GUIDE.md`

2. **Review Code**
   - Start with `page.tsx`
   - Check `admin.ts` for API methods
   - Look at test files for examples

3. **Customize**
   - Adjust filters
   - Modify table columns
   - Update styling
   - Add features

4. **Deploy**
   - Follow `DEPLOYMENT_CHECKLIST.md`
   - Test on staging
   - Deploy to production

## 🎓 Key Files

| File | Purpose |
|------|---------|
| `page.tsx` | Main dashboard component |
| `admin.ts` | API client methods |
| `notification-jobs.ts` | Type definitions |
| `useDebounce.ts` | Debounce hook |
| `ConfirmDialog.tsx` | Confirmation dialog |
| `page.test.tsx` | Component tests |

## 💡 Tips

1. **Use Mock Mode** for frontend development
2. **Check Tests** for usage examples
3. **Read Comments** in code for context
4. **Use DevTools** to debug issues
5. **Check Console** for errors

## ✅ Success Checklist

- [ ] Dependencies installed
- [ ] Tests passing
- [ ] Dev server running
- [ ] Page loads successfully
- [ ] Can filter jobs
- [ ] Can paginate
- [ ] Can replay jobs
- [ ] No console errors

## 🆘 Need Help?

1. Check browser console for errors
2. Review test files for examples
3. Read documentation files
4. Enable mock mode to isolate issues
5. Check `TROUBLESHOOTING.md` (if exists)

## 🎉 You're Ready!

The dashboard is now running and ready for development or testing.

**Happy coding!** 🚀

---

**Time to Complete**: ~5 minutes
**Difficulty**: Easy
**Prerequisites**: Node.js, npm, basic React knowledge
