import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import axios from 'axios';

function App() {
  const [repo, setRepo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const analyzeRepo = async () => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await axios.get(`/api/analyze?repo=${repo}`);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to analyze repository');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h2" component="h1" gutterBottom align="center">
        GitHub Repository Analyzer
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <TextField
              fullWidth
              label="Repository (e.g., facebook/react)"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="owner/repository"
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              onClick={analyzeRepo}
              disabled={loading || !repo}
              size="large"
            >
              {loading ? <CircularProgress size={24} /> : 'Analyze'}
            </Button>
          </Grid>
        </Grid>

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            Error: {error}
          </Typography>
        )}
      </Paper>

      {data && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {data.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {data.description}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="h6">⭐ {data.stars}</Typography>
                    <Typography variant="body2">Stars</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="h6">🍴 {data.forks}</Typography>
                    <Typography variant="body2">Forks</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="h6">👥 {data.contributors?.length || 0}</Typography>
                    <Typography variant="body2">Contributors</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="h6">👀 {data.watchers}</Typography>
                    <Typography variant="body2">Watchers</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Languages
                </Typography>
                <List>
                  {Object.entries(data.languages || {}).map(([lang, bytes]) => (
                    <ListItem key={lang}>
                      <ListItemText
                        primary={lang}
                        secondary={`${Math.round(bytes / 1024)} KB`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Contributors
                </Typography>
                <List>
                  {(data.contributors || []).map((contributor) => (
                    <ListItem key={contributor.login}>
                      <ListItemText
                        primary={contributor.login}
                        secondary={`${contributor.contributions} contributions`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Repository Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Created: {new Date(data.created_at).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated: {new Date(data.updated_at).toLocaleDateString()}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
}

export default App; 