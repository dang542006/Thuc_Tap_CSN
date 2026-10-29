import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { userRepository } from '../repositories/user.repository.js';

const BCRYPT_ROUNDS = 12;

function issueToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function toAuthPayload(user) {
  const { password: _password, ...safeUser } = user;
  return { user: safeUser, token: issueToken(user) };
}

export const authService = {
  async register({ email, password, name }) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) throw new AppError('An account with this email already exists', 409, 'EMAIL_ALREADY_EXISTS');

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await userRepository.createWithDefaults({
      email: normalizedEmail,
      password: passwordHash,
      name: name.trim(),
    });

    return toAuthPayload(user);
  },

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email.trim().toLowerCase());
    const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !passwordMatches || user.status !== 'ACTIVE') {
      throw new AppError('Email or password is incorrect', 401, 'INVALID_CREDENTIALS');
    }

    const publicUser = await userRepository.findPublicById(user.id);
    return toAuthPayload(publicUser);
  },

  async getCurrentUser(userId) {
    const user = await userRepository.findPublicById(userId);
    if (!user || user.status !== 'ACTIVE') throw new AppError('User account was not found', 404, 'USER_NOT_FOUND');
    return user;
  },
};
