import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    validatePassword: jest.fn().mockResolvedValue(true),
  };

  const mockUsersService = {
    create: jest.fn().mockResolvedValue(mockUser),
    findByEmail: jest.fn().mockResolvedValue(mockUser),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Test123!',
        name: 'Test User',
      };

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      });
      expect(mockUsersService.create).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('login', () => {
    it('should login a user with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Test123!',
      };

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token');
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUser.validatePassword = jest.fn().mockResolvedValue(false);
      
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      mockUser.validatePassword = jest.fn().mockResolvedValue(true);
      
      const result = await service.validateUser('test@example.com', 'Test123!');
      
      expect(result).toEqual(mockUser);
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should return null for invalid password', async () => {
      mockUser.validatePassword = jest.fn().mockResolvedValue(false);
      
      const result = await service.validateUser('test@example.com', 'WrongPassword');
      
      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      mockUsersService.findByEmail = jest.fn().mockResolvedValue(null);
      
      const result = await service.validateUser('nonexistent@example.com', 'Test123!');
      
      expect(result).toBeNull();
    });
  });
});