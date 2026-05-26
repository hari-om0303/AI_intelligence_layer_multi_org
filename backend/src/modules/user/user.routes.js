const express = require('express');
const { inviteUser, getUsers, updateUserRole, removeUser } = require('./user.controller');
const { protect } = require('../../middlewares/auth.middleware');
const { requireRole } = require('../../middlewares/rbac.middleware');

const router = express.Router();

router.use(protect);

router.get('/', getUsers);
router.post('/invite', requireRole('ORG_ADMIN'), inviteUser);
router.patch('/:id/role', requireRole('ORG_ADMIN'), updateUserRole);
router.delete('/:id', requireRole('ORG_ADMIN'), removeUser);

module.exports = router;
